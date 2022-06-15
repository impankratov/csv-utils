import { Options as CsvParseOptions, parse } from 'csv-parse';
import { createReadStream, createWriteStream } from 'node:fs';
import * as transform from 'parallel-transform';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { parseToXmlFeed, XmlTransformOptions } from './parse-to-xml-feed';

const DEFAULT_PARALLEL = 1;

const pipelinePromisified = promisify(pipeline);

const parallelAsyncTransform = <T, U>(
  maxParallel: number,
  transformFn: (data: T) => Promise<U>
) =>
  transform(maxParallel, (data, callback) =>
    transformFn(data)
      .then((res) => callback(null, res))
      .catch(callback)
  );

export type CsvToRssTransformAsyncFn<Input, Output> = (
  v: Input
) => Promise<Output>;

export interface CsvToRssOptions<Input, Output> {
  parseOptions?: CsvParseOptions;
  transformFn: CsvToRssTransformAsyncFn<Input, Output>;
  parallel?: number;
  xmlTransformOptions: XmlTransformOptions
}

export function csvToRss<Input, Output>(
  options: CsvToRssOptions<Input, Output>,
  input: string,
  output: string
): Promise<void> {
  return pipelinePromisified(
    createReadStream(input),
    parse({ bom: true, columns: true, ...options.parseOptions }),
    parallelAsyncTransform(
      options.parallel || DEFAULT_PARALLEL,
      options.transformFn
    ),
    parseToXmlFeed(options.xmlTransformOptions),
    createWriteStream(output, {})
  );
}
