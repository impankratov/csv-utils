import { XmlBuilderOptionsOptional } from 'fast-xml-parser';
import { isEmpty } from 'fp-ts/lib/Record';
import { Transform, TransformCallback } from 'node:stream';
import { getParseJsToXmlFn, JsToXmlParseFn } from './js-to-xml-parser';

export type XmlTransformOptions = BaseXmlTransformOptions &
  (WithCustomParserFn | WithXmlBuilderOptions);

interface BaseXmlTransformOptions {
  info?: Record<string, any>;
  /**
   * Content that will be added in the beginning of an XML document
   */
  prolog?: string;
  header?: string;
  footer?: string;
  objectName: string;
}

interface WithCustomParserFn {
  parseFn: JsToXmlParseFn;
}

interface WithXmlBuilderOptions {
  parseOptions?: XmlBuilderOptionsOptional;
}

/**
 * Transform stream that converts stream of objects into XML feed
 */
export class XmlTransform<U extends Record<string, any>> extends Transform {
  prolog: string;
  header: string;
  footer: string;

  objectName: string;
  info?: Record<string, any>;
  parse: JsToXmlParseFn;

  /**
   * If first chunk of stream wasn't processed
   */
  firstChunkProcessed = false;

  constructor(options: XmlTransformOptions) {
    super({ objectMode: true });

    this.prolog = options.prolog || `<?xml version="1.0" encoding="UTF-8"?>`;
    this.header = options.header || '';
    this.footer = options.footer || '';

    this.objectName = options.objectName;

    this.info = options.info;
    this.parse =
      'parseFn' in options
        ? options.parseFn
        : getParseJsToXmlFn(options.parseOptions || {});
  }

  _transform(item: U, _: BufferEncoding, callback: TransformCallback) {
    return callback(null, this.prependHeaderAndChannel(this.parseItem(item)));
  }

  _flush(callback: TransformCallback) {
    callback(null, this.footer);
    this.firstChunkProcessed = false;
  }

  private prependHeaderAndChannel(parsedItem: string): string {
    return this.firstChunkProcessed
      ? parsedItem
      : this.processFirstChunk(parsedItem);
  }

  private processFirstChunk(parsedItem: string) {
    this.firstChunkProcessed = true;
    return this.prolog + '\n' + this.header + this.parseInfo() + parsedItem;
  }

  private parseItem(object: U): string {
    return isEmpty(object) ? '' : this.parse({ [this.objectName]: object });
  }

  private parseInfo(): string {
    return this.info ? this.parse(this.info) : '';
  }
}

export const parseToXmlFeed = (options: XmlTransformOptions) =>
  new XmlTransform(options);
