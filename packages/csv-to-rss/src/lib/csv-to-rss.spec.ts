import { createReadStream, createWriteStream } from 'node:fs';
import { csvToRss } from './csv-to-rss';

jest.mock('node:fs', () => {
  const originalModule = jest.requireActual('node:fs');

  const { Readable, Writable } = require('node:stream');

  const createReadStreamMock = jest.fn();

  let output: string[] = [];
  (createReadStreamMock as any).__mockOutput = (o: string[]) => (output = o);

  createReadStreamMock.mockImplementation(() => {
    const readable = new Readable();

    output.forEach((l: string) => readable.push(l));

    readable.push(null);

    return readable;
  });

  class WriteInMemory extends Writable {
    buffer: string = '';

    constructor() {
      super();
    }

    _write(chunk: Buffer, _: any, next: () => any) {
      this.buffer += chunk;
      next();
    }

    reset() {
      this.buffer = '';
    }
  }

  const MockWriteStream = new WriteInMemory();

  const createWriteStreamMock = jest.fn().mockImplementation(() => {
    MockWriteStream.reset();
    return MockWriteStream;
  });

  (createWriteStreamMock as any).__mock = MockWriteStream;

  return {
    __esModule: true,
    ...originalModule,
    createReadStream: createReadStreamMock,
    createWriteStream: createWriteStreamMock,
  };
});

const records = [
  {
    Id: '0001',
    Date: '07/05/1999',
    Title: ' Lorem ipsum dolor sit amet',
    Description:
      'Lorem ipsum dolor sit amet qui minim labore adipisicing minim sint cillum sint consectetur cupidatat.',
  },
  {
    Id: '0002',
    Date: '15/12/2000',
    Title: 'Lorem ipsum',
    Description:
      'Lorem ipsum dolor sit amet qui minim labore adipisicing minim sint cillum sint consectetur cupidatat.',
  },
  {
    Id: '0003',
    Date: '21/03/2003',
    Title: 'Lorem',
    Description:
      'Lorem ipsum dolor sit amet qui minim labore adipisicing minim sint cillum sint consectetur cupidatat.',
  },
];

const objectToCsv = (obj: Object) =>
  Object.values(obj).reduce(
    (res, v, i, arr) => `${res},${v}${arr.length - i === 1 ? '\n' : ''}`
  );

const getDummyCsvData = () =>
  [
    // 'Id,Title,Description,Date\n',
    `${Object.keys(records[0]).join(',')}\n`,
  ].concat(records.map(objectToCsv));

describe('csvToRss', () => {
  it('should work', async () => {
    (createReadStream as any).__mockOutput(getDummyCsvData());

    const TEST_INPUT = 'input.csv';
    const TEST_OUTPUT = 'output.xml';
    const TRANSFORM_FN = jest.fn((v) => Promise.resolve(v));

    await csvToRss(
      {
        transformFn: TRANSFORM_FN,
        xmlTransformOptions: {
          objectName: 'entry',
        },
      },
      TEST_INPUT,
      TEST_OUTPUT
    );

    expect(createReadStream).toHaveBeenCalledWith(TEST_INPUT);
    expect(TRANSFORM_FN.mock.calls).toMatchSnapshot();

    expect(createWriteStream).toHaveBeenCalledWith(TEST_OUTPUT, {});
    expect((createWriteStream as any).__mock.buffer).toMatchSnapshot();
  });
});
