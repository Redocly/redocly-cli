import { blue, yellow, gray } from 'colorette';
import { writeFileSync } from 'fs';
import { stringifyYaml } from '../utils/yaml';
import { generateArazzoDescription } from '../modules/arazzo-description-generator';
import { DefaultLogger } from '../utils/logger/logger';
import { exitWithError } from '../utils/exit-with-error';
import { type CommandArgs } from '../types';
import * as path from 'path';
import * as fs from 'fs';

export type GenerateArazzoFileOptions = {
  descriptionPath: string;
  'output-file'?: string;
  config?: never;
};

const logger = DefaultLogger.getInstance();

export async function handleGenerate({ argv }: CommandArgs<GenerateArazzoFileOptions>) {
  try {
    logger.log(gray('\n  Generating Arazzo description... \n'));

    const generatedConfig = await generateArazzoDescription(argv);
    const content = stringifyYaml(generatedConfig);

    let outputPath = argv['output-file'] || 'auto-generated.arazzo.yaml';

    if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
      outputPath = path.join(outputPath, 'auto-generated.arazzo.yaml');
    } else if (!path.extname(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
      outputPath = path.join(outputPath, 'auto-generated.arazzo.yaml');
    }

    writeFileSync(outputPath, content);

    logger.log(
      '\n' + blue(`Arazzo description ${yellow(outputPath)} successfully generated.`) + '\n'
    );
  } catch (_err) {
    exitWithError('\n' + '❌  Arazzo description generation failed.');
  }
}
