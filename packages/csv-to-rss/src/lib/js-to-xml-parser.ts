import {
  XMLBuilder,
  XmlBuilderOptions,
  XmlBuilderOptionsOptional,
} from 'fast-xml-parser';

const defaultOptions: Partial<XmlBuilderOptions> = {
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  ignoreAttributes: false,
  cdataPropName: '__cdata',
  format: true,
};

export type JsToXmlParseFn = (body: Record<any, any>) => string;

/**
 * Parse javascript object to XML node
 */
export const getParseJsToXmlFn =
  (customOptions: XmlBuilderOptionsOptional): JsToXmlParseFn =>
  (body): string =>
    new XMLBuilder({ ...defaultOptions, ...customOptions }).build(body);
