const modules = {
  'jsr:@supabase/functions-js/edge-runtime.d.ts': 'export {}',
  'jsr:@std/encoding@1.0.5/base64': 'export const encodeBase64 = bytes => Buffer.from(bytes).toString("base64");',
  // Generation with the real renderer belongs to the Edge integration test.
  'npm:pdf-lib@1.17.1': `
    export const rgb = (red, green, blue) => ({ red, green, blue });
    export const StandardFonts = {};
    export const PDFDocument = { create() { throw Error('Test does not provide the PDF renderer'); } };
  `,
};

export function resolve(specifier, context, nextResolve) {
  if (specifier === 'npm:@supabase/supabase-js@2.112.3') {
    return nextResolve('@supabase/supabase-js', context);
  }
  if (Object.hasOwn(modules, specifier)) {
    return { url: `data:text/javascript,${encodeURIComponent(modules[specifier])}`, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
