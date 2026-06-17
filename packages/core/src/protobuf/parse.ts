import { fromBinary } from '@bufbuild/protobuf';
import {
  FieldDescriptorProto_Label,
  FieldDescriptorProto_Type,
  FileDescriptorSetSchema,
  type DescriptorProto,
  type EnumDescriptorProto,
  type EnumValueDescriptorProto,
  type FieldDescriptorProto,
  type FileDescriptorProto,
  type MethodDescriptorProto,
  type ServiceDescriptorProto,
  type SourceCodeInfo_Location,
} from '@bufbuild/protobuf/wkt';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';

import { ProtoParseError, ProtoUnsupportedSyntaxError } from '../errors/protobuf-errors.js';
import { escapePointerFragment } from '../ref-utils.js';
import { Source, type Document } from '../resolve.js';
import type {
  ProtoDocument,
  ProtoEnum,
  ProtoEnumValue,
  ProtoField,
  ProtoImport,
  ProtoLocation,
  ProtoMessage,
  ProtoPackage,
  ProtoRpc,
  ProtoService,
  ProtoSyntax,
} from '../typings/protobuf.js';

const FILE_DESCRIPTOR_PACKAGE_PATH = [2];
const FILE_DESCRIPTOR_DEPENDENCY_PATH = [3];
const FILE_DESCRIPTOR_MESSAGE_TYPE_PATH = [4];
const FILE_DESCRIPTOR_ENUM_TYPE_PATH = [5];
const FILE_DESCRIPTOR_SERVICE_PATH = [6];
const FILE_DESCRIPTOR_SYNTAX_PATH = [12];
const DESCRIPTOR_FIELD_PATH = [2];
const DESCRIPTOR_NESTED_TYPE_PATH = [3];
const DESCRIPTOR_ENUM_TYPE_PATH = [4];
const ENUM_VALUE_PATH = [2];
const SERVICE_METHOD_PATH = [2];
const require = createRequire(import.meta.url);
const protocPackageDir = path.dirname(require.resolve('@protobuf-ts/protoc/package.json'));
const protocInstallLockDir = path.join(protocPackageDir, 'installed', '.redocly-install-lock');

export function parseProtoDocument(source: string, absoluteRef: string): ProtoDocument {
  return parseProtoDocumentFromSource(new Source(absoluteRef, source), absoluteRef);
}

export function makeProtoDocumentFromString(
  source: string,
  absoluteRef: string
): Document<ProtoDocument> {
  const sourceRef = new Source(absoluteRef, source);
  return {
    source: sourceRef,
    parsed: parseProtoDocumentFromSource(sourceRef, absoluteRef),
  };
}

function parseProtoDocumentFromSource(sourceRef: Source, ref: string): ProtoDocument {
  const descriptor = createFileDescriptor(ref, sourceRef.body);
  const syntax = descriptor.syntax || undefined;

  if (syntax !== 'proto3') {
    throw new ProtoUnsupportedSyntaxError(syntax, {
      source: sourceRef,
      start: createLocation(sourceRef, findSourceLocation(descriptor, FILE_DESCRIPTOR_SYNTAX_PATH))
        .start,
    });
  }

  return createDocument(sourceRef, descriptor);
}

function createFileDescriptor(ref: string, source: string): FileDescriptorProto {
  const existingPath = fs.existsSync(ref) ? path.resolve(ref) : undefined;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'redocly-proto-'));
  const protoPath = existingPath || path.join(tempDir, path.basename(ref) || 'schema.proto');
  const descriptorPath = path.join(tempDir, 'descriptor.pb');

  try {
    if (!existingPath) {
      fs.writeFileSync(protoPath, source, 'utf-8');
    }

    runProtoc(protoPath, descriptorPath);

    const descriptorSet = fromBinary(FileDescriptorSetSchema, fs.readFileSync(descriptorPath));
    const relativeProtoPath = path.basename(protoPath);
    const descriptor =
      descriptorSet.file.find((file) => file.name === relativeProtoPath) || descriptorSet.file[0];

    if (!descriptor) {
      throw new ProtoParseError('protoc did not emit a file descriptor.');
    }

    return descriptor;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function runProtoc(protoPath: string, descriptorPath: string): void {
  const protocCommand = getProtocCommand();
  const protoDir = path.dirname(protoPath);
  const protoFile = path.basename(protoPath);
  const result = spawnSync(
    protocCommand.command,
    [
      ...protocCommand.args,
      `--descriptor_set_out=${descriptorPath}`,
      '--include_source_info',
      `--proto_path=${protoDir}`,
      protoFile,
    ],
    {
      cwd: protoDir,
      encoding: 'utf-8',
      shell: false,
      windowsHide: true,
    }
  );

  if (result.error) {
    throw new ProtoParseError(`Failed to execute protoc: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new ProtoParseError((result.stderr || result.stdout || 'protoc failed.').trim());
  }
}

function getProtocCommand(): { command: string; args: string[] } {
  const installedProtoc = findInstalledProtoc();
  if (installedProtoc) {
    return { command: installedProtoc, args: [] };
  }

  installProtocOnce();

  const installedAfterLock = findInstalledProtoc();
  if (installedAfterLock) {
    return { command: installedAfterLock, args: [] };
  }

  return {
    command: process.execPath,
    args: [require.resolve('@protobuf-ts/protoc/protoc.js')],
  };
}

function installProtocOnce(): void {
  while (!tryAcquireInstallLock()) {
    if (findInstalledProtoc()) return;
    sleep(50);
  }

  try {
    if (findInstalledProtoc()) return;
    const result = spawnSync(
      process.execPath,
      [require.resolve('@protobuf-ts/protoc/protoc.js'), '--version'],
      {
        encoding: 'utf-8',
        shell: false,
        windowsHide: true,
      }
    );

    if (result.error) {
      throw new ProtoParseError(`Failed to install protoc: ${result.error.message}`);
    }

    if (result.status !== 0) {
      throw new ProtoParseError(
        (result.stderr || result.stdout || 'protoc install failed.').trim()
      );
    }
  } finally {
    fs.rmSync(protocInstallLockDir, { recursive: true, force: true });
  }
}

function tryAcquireInstallLock(): boolean {
  try {
    fs.mkdirSync(protocInstallLockDir, { recursive: false });
    return true;
  } catch {
    return false;
  }
}

function findInstalledProtoc(): string | undefined {
  const installDir = path.join(protocPackageDir, 'installed');
  if (!fs.existsSync(installDir)) return undefined;

  for (const name of fs.readdirSync(installDir)) {
    if (!name.startsWith('protoc-')) continue;
    const executable = path.join(
      installDir,
      name,
      'bin',
      process.platform === 'win32' ? 'protoc.exe' : 'protoc'
    );
    if (fs.existsSync(executable)) return executable;
  }

  return undefined;
}

function createDocument(source: Source, descriptor: FileDescriptorProto): ProtoDocument {
  return {
    syntax: createSyntax(source, descriptor),
    package: createPackage(source, descriptor),
    imports: createImports(source, descriptor),
    messages: descriptor.messageType.map((message, index) =>
      createMessage(source, descriptor, message, [...FILE_DESCRIPTOR_MESSAGE_TYPE_PATH, index])
    ),
    enums: descriptor.enumType.map((protoEnum, index) =>
      createEnum(source, descriptor, protoEnum, [...FILE_DESCRIPTOR_ENUM_TYPE_PATH, index])
    ),
    services: descriptor.service.map((service, index) =>
      createService(source, descriptor, service, [...FILE_DESCRIPTOR_SERVICE_PATH, index])
    ),
  };
}

function createSyntax(source: Source, descriptor: FileDescriptorProto): ProtoSyntax | undefined {
  if (!descriptor.syntax) return undefined;
  return {
    value: descriptor.syntax,
    location: createLocation(
      source,
      findSourceLocation(descriptor, FILE_DESCRIPTOR_SYNTAX_PATH),
      '#/syntax'
    ),
  };
}

function createPackage(source: Source, descriptor: FileDescriptorProto): ProtoPackage | undefined {
  if (!descriptor.package) return undefined;
  return {
    name: descriptor.package,
    location: createLocation(
      source,
      findSourceLocation(descriptor, FILE_DESCRIPTOR_PACKAGE_PATH),
      '#/package'
    ),
  };
}

function createImports(source: Source, descriptor: FileDescriptorProto): ProtoImport[] {
  return descriptor.dependency.map((importPath, index) => ({
    path: importPath,
    public: descriptor.publicDependency.includes(index) || undefined,
    weak: descriptor.weakDependency.includes(index) || undefined,
    location: createLocation(
      source,
      findSourceLocation(descriptor, [...FILE_DESCRIPTOR_DEPENDENCY_PATH, index]),
      `#/imports/${index}`
    ),
  }));
}

function createMessage(
  source: Source,
  file: FileDescriptorProto,
  message: DescriptorProto,
  path: number[],
  parentPointer = '#/messages'
): ProtoMessage {
  const pointer = `${parentPointer}/${escapePointerFragment(message.name)}`;
  return {
    name: message.name,
    fields: message.field.map((field, index) =>
      createField(source, file, field, [...path, ...DESCRIPTOR_FIELD_PATH, index], pointer)
    ),
    messages: message.nestedType.map((nested, index) =>
      createMessage(source, file, nested, [...path, ...DESCRIPTOR_NESTED_TYPE_PATH, index], pointer)
    ),
    enums: message.enumType.map((protoEnum, index) =>
      createEnum(source, file, protoEnum, [...path, ...DESCRIPTOR_ENUM_TYPE_PATH, index], pointer)
    ),
    location: createLocation(source, findSourceLocation(file, [...path, 1]), pointer),
  };
}

function createField(
  source: Source,
  file: FileDescriptorProto,
  field: FieldDescriptorProto,
  path: number[],
  parentPointer: string
): ProtoField {
  const pointer = `${parentPointer}/fields/${escapePointerFragment(field.name)}`;
  return {
    name: field.name,
    type: getFieldType(field),
    number: field.number,
    repeated: field.label === FieldDescriptorProto_Label.REPEATED || undefined,
    optional: field.proto3Optional || undefined,
    location: createLocation(source, findSourceLocation(file, [...path, 1]), pointer),
  };
}

function createEnum(
  source: Source,
  file: FileDescriptorProto,
  protoEnum: EnumDescriptorProto,
  path: number[],
  parentPointer = '#/enums'
): ProtoEnum {
  const pointer = `${parentPointer}/${escapePointerFragment(protoEnum.name)}`;
  return {
    name: protoEnum.name,
    values: protoEnum.value.map((value, index) =>
      createEnumValue(source, file, value, [...path, ...ENUM_VALUE_PATH, index], pointer)
    ),
    location: createLocation(source, findSourceLocation(file, [...path, 1]), pointer),
  };
}

function createEnumValue(
  source: Source,
  file: FileDescriptorProto,
  value: EnumValueDescriptorProto,
  path: number[],
  parentPointer: string
): ProtoEnumValue {
  const pointer = `${parentPointer}/values/${escapePointerFragment(value.name)}`;
  return {
    name: value.name,
    number: value.number,
    location: createLocation(source, findSourceLocation(file, [...path, 1]), pointer),
  };
}

function createService(
  source: Source,
  file: FileDescriptorProto,
  service: ServiceDescriptorProto,
  path: number[]
): ProtoService {
  const pointer = `#/services/${escapePointerFragment(service.name)}`;
  return {
    name: service.name,
    rpcs: service.method.map((method, index) =>
      createRpc(source, file, method, [...path, ...SERVICE_METHOD_PATH, index], pointer)
    ),
    location: createLocation(source, findSourceLocation(file, [...path, 1]), pointer),
  };
}

function createRpc(
  source: Source,
  file: FileDescriptorProto,
  method: MethodDescriptorProto,
  path: number[],
  parentPointer: string
): ProtoRpc {
  const pointer = `${parentPointer}/rpcs/${escapePointerFragment(method.name)}`;
  return {
    name: method.name,
    requestType: toLocalTypeName(method.inputType),
    responseType: toLocalTypeName(method.outputType),
    requestStream: method.clientStreaming || undefined,
    responseStream: method.serverStreaming || undefined,
    location: createLocation(source, findSourceLocation(file, [...path, 1]), pointer),
  };
}

function findSourceLocation(
  descriptor: FileDescriptorProto,
  path: number[]
): SourceCodeInfo_Location | undefined {
  return descriptor.sourceCodeInfo?.location.find((location) => isSamePath(location.path, path));
}

function createLocation(
  source: Source,
  location: SourceCodeInfo_Location | undefined,
  pointer = '#/'
): ProtoLocation {
  if (!location?.span.length) return { source, pointer };

  const [startLine = 0, startCol = 0, endLine, endCol] = location.span;
  return {
    source,
    pointer,
    start: {
      line: startLine + 1,
      col: startCol + 1,
    },
    end:
      endLine !== undefined && endCol !== undefined
        ? {
            line: endLine + 1,
            col: endCol + 1,
          }
        : undefined,
  };
}

function getFieldType(field: FieldDescriptorProto): string {
  if (field.typeName) return removeLeadingDot(field.typeName);

  switch (field.type) {
    case FieldDescriptorProto_Type.DOUBLE:
      return 'double';
    case FieldDescriptorProto_Type.FLOAT:
      return 'float';
    case FieldDescriptorProto_Type.INT64:
      return 'int64';
    case FieldDescriptorProto_Type.UINT64:
      return 'uint64';
    case FieldDescriptorProto_Type.INT32:
      return 'int32';
    case FieldDescriptorProto_Type.FIXED64:
      return 'fixed64';
    case FieldDescriptorProto_Type.FIXED32:
      return 'fixed32';
    case FieldDescriptorProto_Type.BOOL:
      return 'bool';
    case FieldDescriptorProto_Type.STRING:
      return 'string';
    case FieldDescriptorProto_Type.GROUP:
      return 'group';
    case FieldDescriptorProto_Type.MESSAGE:
      return 'message';
    case FieldDescriptorProto_Type.BYTES:
      return 'bytes';
    case FieldDescriptorProto_Type.UINT32:
      return 'uint32';
    case FieldDescriptorProto_Type.ENUM:
      return 'enum';
    case FieldDescriptorProto_Type.SFIXED32:
      return 'sfixed32';
    case FieldDescriptorProto_Type.SFIXED64:
      return 'sfixed64';
    case FieldDescriptorProto_Type.SINT32:
      return 'sint32';
    case FieldDescriptorProto_Type.SINT64:
      return 'sint64';
    default:
      return 'unknown';
  }
}

function isSamePath(left: number[], right: number[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function removeLeadingDot(value: string): string {
  return value.startsWith('.') ? value.slice(1) : value;
}

function toLocalTypeName(value: string): string {
  const normalized = removeLeadingDot(value);
  return normalized.split('.').pop() || normalized;
}

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
