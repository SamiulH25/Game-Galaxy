import { expect, it } from 'vitest';
import { z } from 'zod';
import { GameManifestSchema, SystemsFileSchema } from '$lib/server/manifest';

// The JSON Schemas in /schemas give editors autocomplete for game.json and systems.json.
// They are generated from the zod schemas: run `npm run schemas` after changing manifest.ts.
const render = (schema: z.ZodType, title: string) =>
	JSON.stringify({ ...z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }), title }, null, '\t') + '\n';

it('game.schema.json is up to date', async () => {
	await expect(render(GameManifestSchema, 'Game Galaxy game manifest (game.json)')).toMatchFileSnapshot('../schemas/game.schema.json');
});

it('systems.schema.json is up to date', async () => {
	await expect(render(SystemsFileSchema, 'Game Galaxy star systems (systems.json)')).toMatchFileSnapshot('../schemas/systems.schema.json');
});
