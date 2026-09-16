import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: 'stdio-cafe-mcp', version: '1.2.3' },
  { capabilities: { tools: {} }, instructions: 'Manage cafe orders over stdio.' }
);
server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: [
    {
      name: 'menu/get',
      description: 'Get the menu.',
      inputSchema: { type: 'object' },
    },
  ],
}));
await server.connect(new StdioServerTransport());
