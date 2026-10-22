import * as fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getCommandOutput, getParams } from "../../helpers.js";
import { startServer, stopAndRestore } from "./server-process.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "fake-db.json");

describe("local-json-server", () => {
  let server: ReturnType<typeof startServer> | undefined;
  let originalData: string | undefined;

  beforeAll(async () => {
    originalData = fs.readFileSync(dbPath, "utf8");
    server = startServer(
      process.execPath,
      [process.env.npm_execpath!, "run", "json-server"],
      "http://localhost:3000/items"
    );
    await server.ready;
  }, 45_000);

  afterAll(async () => {
    await stopAndRestore(server?.stop, () => {
      if (originalData !== undefined) fs.writeFileSync(dbPath, originalData);
    });
  }, 15_000);

  test("local-json-server test case", () => {
    const indexEntryPoint = join(process.cwd(), "packages/cli/lib/index.js");
    const fixturesPath = join(__dirname, "local-json-server.arazzo.yaml");
    const args = getParams(indexEntryPoint, ["respect", fixturesPath]);

    const result = getCommandOutput(args);
    expect(result).toMatchSnapshot();
  });
});
