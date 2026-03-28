import { Calculator, UnitSystem } from '@/types';

// Conversion helpers
const mmToInch = (mm: number) => mm / 25.4;
const inchToMm = (inch: number) => inch * 25.4;
const mpsToFps = (mps: number) => mps * 3.28084;
const fpsToMps = (fps: number) => fps / 3.28084;

export const calculators: Calculator[] = [
  {
    id: 'qw',
    name: 'Specific Material Removal Rate',
    shortName: 'Q\'w',
    description: 'Calculate the volume of material removed per unit width per unit time',
    categories: ['Surface Grinding'],
    inputs: [
      {
        label: 'Workpiece Speed',
        key: 'vw',
        unit: { metric: 'm/min', imperial: 'ft/min' },
        placeholder: { metric: '10-50', imperial: '30-150' },
        tooltip: 'Speed of the workpiece surface',
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        label: 'Depth of Cut',
        key: 'ae',
        unit: { metric: 'mm', imperial: 'inch' },
        placeholder: { metric: '0.01-0.5', imperial: '0.0004-0.02' },
        tooltip: 'Radial depth of material being removed',
        min: 0,
        max: 10,
        step: 0.001,
      },
    ],
    calculate: (inputs, unitSystem) => {
      const { vw, ae } = inputs;
      if (!vw || !ae) return { label: 'Q\'w', value: null, unit: { metric: 'mm³/mm·s', imperial: 'in³/in·s' } };
      
      let result: number;
      if (unitSystem === 'metric') {
        result = (vw * 1000 / 60) * ae; // mm³/mm·s
      } else {
        result = (vw * 12 / 60) * ae; // in³/in·s
      }
      
      return {
        label: 'Q\'w',
        value: result,
        unit: { metric: 'mm³/mm·s', imperial: 'in³/in·s' },
        scale: {
          min: 0,
          max: unitSystem === 'metric' ? 50 : 2,
          optimal: { 
            min: unitSystem === 'metric' ? 5 : 0.2, 
            max: unitSystem === 'metric' ? 25 : 1 
          },
        },
      };
    },
  },
  {
    id: 'qs',
    name: 'Speed Ratio',
    shortName: 'Qs',
    description: 'Ratio between wheel speed and workpiece speed',
    categories: ['Surface Grinding', 'OD Grinding', 'ID Grinding'],
    inputs: [
      {
        label: 'Wheel Speed',
        key: 'vs',
        unit: { metric: 'm/s', imperial: 'ft/s' },
        placeholder: { metric: '25-45', imperial: '80-150' },
        tooltip: 'Peripheral speed of the grinding wheel',
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        label: 'Workpiece Speed',
        key: 'vw',
        unit: { metric: 'm/min', imperial: 'ft/min' },
        placeholder: { metric: '10-50', imperial: '30-150' },
        tooltip: 'Speed of the workpiece surface',
        min: 0,
        max: 100,
        step: 0.1,
      },
    ],
    calculate: (inputs, unitSystem) => {
      const { vs, vw } = inputs;
      if (!vs || !vw) return { label: 'Qs', value: null, unit: { metric: '', imperial: '' } };
      
      const vwInMps = unitSystem === 'metric' ? vw / 60 : fpsToMps(vw / 60);
      const vsInMps = unitSystem === 'metric' ? vs : fpsToMps(vs);
      const result = vsInMps / vwInMps;
      
      return {
        label: 'Qs',
        value: result,
        unit: { metric: '', imperial: '' },
        scale: {
          min: 0,
          max: 200,
          optimal: { min: 40, max: 80 },
        },
      };
    },
  },
  {
    id: 'hm',
    name: 'Theoretical Chip Thickness',
    shortName: 'Hm',
    description: 'Average thickness of material removed by each grain',
    categories: ['ID Grinding', 'OD Grinding', 'Surface Grinding'],
    inputs: [
      {
        label: 'Depth of Cut',
        key: 'ae',
        unit: { metric: 'mm', imperial: 'inch' },
        placeholder: { metric: '0.01-0.5', imperial: '0.0004-0.02' },
        tooltip: 'Radial depth of material being removed',
        min: 0,
        max: 10,
        step: 0.001,
      },
      {
        label: 'Speed Ratio',
        key: 'qs',
        unit: { metric: '', imperial: '' },
        placeholder: { metric: '40-80', imperial: '40-80' },
        tooltip: 'Ratio between wheel and workpiece speed',
        min: 1,
        max: 200,
        step: 1,
      },
      {
        label: 'Wheel Diameter',
        key: 'ds',
        unit: { metric: 'mm', imperial: 'inch' },
        placeholder: { metric: '200-500', imperial: '8-20' },
        tooltip: 'Diameter of the grinding wheel',
        min: 1,
        max: 1000,
        step: 1,
      },
      {
        label: 'Workpiece Diameter',
        key: 'dw',
        unit: { metric: 'mm', imperial: 'inch' },
        placeholder: { metric: '20-200', imperial: '1-8' },
        tooltip: 'Diameter of the workpiece (0 for flat)',
        min: 0,
        max: 1000,
        step: 1,
      },
    ],
    calculate: (inputs, unitSystem) => {
      const { ae, qs, ds, dw } = inputs;
      if (!ae || !qs || !ds) return { label: 'Hm', value: null, unit: { metric: 'μm', imperial: 'μin' } };
      
      const deq = dw > 0 ? (ds * dw) / (ds + dw) : ds;
      let hm = 2 * Math.sqrt(ae / deq) / qs;
      
      // Convert to micrometers or microinches
      if (unitSystem === 'metric') {
        hm = hm * 1000; // mm to μm
      } else {
        hm = hm * 1000; // inch to μin
      }
      
      return {
        label: 'Hm',
        value: hm,
        unit: { metric: 'μm', imperial: 'μin' },
        scale: {
          min: 0,
          max: unitSystem === 'metric' ? 20 : 800,
          optimal: { 
            min: unitSystem === 'metric' ? 2 : 80, 
            max: unitSystem === 'metric' ? 10 : 400 
          },
        },
      };
    },
  },
  {
    id: 'la',
    name: 'Contact Arc Length',
    shortName: 'La',
    description: 'Length of the contact arc between wheel and workpiece',
    categories: ['OD Grinding', 'ID Grinding', 'Surface Grinding'],
    inputs: [
      {
        label: 'Depth of Cut',
        key: 'ae',
        unit: { metric: 'mm', imperial: 'inch' },
        placeholder: { metric: '0.01-0.5', imperial: '0.0004-0.02' },
        tooltip: 'Radial depth of material being removed',
        min: 0,
        max: 10,
        step: 0.001,
      },
      {
        label: 'Wheel Diameter',
        key: 'ds',
        unit: { metric: 'mm', imperial: 'inch' },
        placeholder: { metric: '200-500', imperial: '8-20' },
        tooltip: 'Diameter of the grinding wheel',
        min: 1,
        max: 1000,
        step: 1,
      },
      {
        label: 'Workpiece Diameter',
        key: 'dw',
        unit: { metric: 'mm', imperial: 'inch' },
        placeholder: { metric: '20-200', imperial: '1-8' },
        tooltip: 'Diameter of the workpiece (0 for flat)',
        min: 0,
        max: 1000,
        step: 1,
      },
    ],
    calculate: (inputs, unitSystem) => {
      const { ae, ds, dw } = inputs;
      if (!ae || !ds) return { label: 'La', value: null, unit: { metric: 'mm', imperial: 'inch' } };
      
      const deq = dw > 0 ? (ds * dw) / (ds + dw) : ds;
      const la = Math.sqrt(ae * deq);
      
      return {
        label: 'La',
        value: la,
        unit: { metric: 'mm', imperial: 'inch' },
        scale: {
          min: 0,
          max: unitSystem === 'metric' ? 20 : 0.8,
          optimal: { 
            min: unitSystem === 'metric' ? 2 : 0.08, 
            max: unitSystem === 'metric' ? 10 : 0.4 
          },
        },
      };
    },
  },
  {
    id: 'ud',
    name: 'Dressing Lead',
    shortName: 'Ud',
    description: 'Lead rate for single point diamond dressing',
    categories: ['Dressing'],
    inputs: [
      {
        label: 'Wheel Speed',
        key: 'ns',
        unit: { metric: 'rpm', imperial: 'rpm' },
        placeholder: { metric: '1000-3000', imperial: '1000-3000' },
        tooltip: 'Rotational speed of the grinding wheel',
        min: 100,
        max: 5000,
        step: 10,
      },
      {
        label: 'Dressing Depth',
        key: 'ad',
        unit: { metric: 'μm', imperial: 'μin' },
        placeholder: { metric: '5-25', imperial: '200-1000' },
        tooltip: 'Depth of cut during dressing',
        min: 1,
        max: 100,
        step: 1,
      },
    ],
    calculate: (inputs, unitSystem) => {
      const { ns, ad } = inputs;
      if (!ns || !ad) return { label: 'Ud', value: null, unit: { metric: 'mm/rev', imperial: 'in/rev' } };
      
      let adInMm = unitSystem === 'metric' ? ad / 1000 : (ad / 1000000) * 25.4;
      const ud = adInMm * 0.1; // Typical lead factor
      
      return {
        label: 'Ud',
        value: unitSystem === 'metric' ? ud : ud / 25.4,
        unit: { metric: 'mm/rev', imperial: 'in/rev' },
        scale: {
          min: 0,
          max: unitSystem === 'metric' ? 0.01 : 0.0004,
          optimal: { 
            min: unitSystem === 'metric' ? 0.001 : 0.00004, 
            max: unitSystem === 'metric' ? 0.005 : 0.0002 
          },
        },
      };
    },
  },
  {
    id: 'vd',
    name: 'Dressing Speed Ratio',
    shortName: 'Vd',
    description: 'Speed ratio between wheel and dresser',
    categories: ['Dressing'],
    inputs: [
      {
        label: 'Wheel Speed',
        key: 'vs',
        unit: { metric: 'm/s', imperial: 'ft/s' },
        placeholder: { metric: '25-45', imperial: '80-150' },
        tooltip: 'Peripheral speed of the grinding wheel',
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        label: 'Dresser Speed',
        key: 'vdr',
        unit: { metric: 'm/s', imperial: 'ft/s' },
        placeholder: { metric: '0.5-2', imperial: '1.5-6' },
        tooltip: 'Speed of the dressing tool',
        min: 0,
        max: 10,
        step: 0.1,
      },
    ],
    calculate: (inputs, unitSystem) => {
      const { vs, vdr } = inputs;
      if (!vs || !vdr) return { label: 'Vd', value: null, unit: { metric: '', imperial: '' } };
      
      const vsInMps = unitSystem === 'metric' ? vs : fpsToMps(vs);
      const vdrInMps = unitSystem === 'metric' ? vdr : fpsToMps(vdr);
      const result = vsInMps / vdrInMps;
      
      return {
        label: 'Vd',
        value: result,
        unit: { metric: '', imperial: '' },
        scale: {
          min: 0,
          max: 100,
          optimal: { min: 10, max: 40 },
        },
      };
    },
  },
  {
    id: 'coolant_flow',
    name: 'Coolant Flow Rate',
    shortName: 'Qc',
    description: 'Required coolant flow rate for grinding operation',
    categories: ['Coolant'],
    inputs: [
      {
        label: 'Wheel Width',
        key: 'bw',
        unit: { metric: 'mm', imperial: 'inch' },
        placeholder: { metric: '10-50', imperial: '0.4-2' },
        tooltip: 'Width of the grinding wheel',
        min: 1,
        max: 100,
        step: 1,
      },
      {
        label: 'Material Removal Rate',
        key: 'qw',
        unit: { metric: 'mm³/mm·s', imperial: 'in³/in·s' },
        placeholder: { metric: '5-25', imperial: '0.2-1' },
        tooltip: 'Specific material removal rate',
        min: 0.1,
        max: 50,
        step: 0.1,
      },
    ],
    calculate: (inputs, unitSystem) => {
      const { bw, qw } = inputs;
      if (!bw || !qw) return { label: 'Qc', value: null, unit: { metric: 'L/min', imperial: 'gal/min' } };
      
      // Coolant flow calculation based on material removal
      let flowRate = bw * qw * 0.5; // Base flow factor
      
      if (unitSystem === 'imperial') {
        flowRate = flowRate * 0.264; // Convert to gal/min
      } else {
        flowRate = flowRate / 1000 * 60; // Convert to L/min
      }
      
      return {
        label: 'Qc',
        value: flowRate,
        unit: { metric: 'L/min', imperial: 'gal/min' },
        scale: {
          min: 0,
          max: unitSystem === 'metric' ? 50 : 13,
          optimal: { 
            min: unitSystem === 'metric' ? 5 : 1.3, 
            max: unitSystem === 'metric' ? 25 : 6.6 
          },
        },
      };
    },
  },
];

export const getCalculatorById = (id: string) => calculators.find(c => c.id === id);

export const getCalculatorsByCategory = (category: string) => 
  calculators.filter(c => c.categories.includes(category));

export const getCategories = () => 
  Array.from(new Set(calculators.flatMap(c => c.categories)));