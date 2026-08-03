// Architected with `redocly architect-generator ops-summary`, then filled in:
// emits a markdown operations summary next to the client — an artifact no
// built-in generator covers, derived from the same API model, so it can
// never drift from the description.
import { Printer } from '@redocly/client-generator';

export default {
  name: 'ops-summary',
  run({ model, outputPath }) {
    const writer = new Printer('  ');
    writer.line(`# ${model.title} ${model.version} — operations`);
    writer.blank();
    writer.line('| Operation | Method | Path | Summary |');
    writer.line('| --- | --- | --- | --- |');
    for (const service of model.services) {
      for (const op of service.operations) {
        const summary = (op.summary ?? '').split('\n')[0];
        writer.line(`| ${op.name} | ${op.method.toUpperCase()} | \`${op.path}\` | ${summary} |`);
      }
    }
    return [{ path: outputPath.replace(/\.[^.]+$/, '.operations.md'), content: writer.toString() }];
  },
};
