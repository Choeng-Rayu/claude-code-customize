/**
 * Script to generate coreTypes.generated.ts from coreSchemas.ts
 * Run with: bun run generate-core-types.ts
 */

import { readFileSync, writeFileSync } from 'fs'

const schemasPath = './src/entrypoints/sdk/coreSchemas.ts'
const outputPath = './src/entrypoints/sdk/coreTypes.generated.ts'

const content = readFileSync(schemasPath, 'utf-8')

// Extract schema names: export const XxxSchema = lazySchema(...)
const schemaRegex = /export const (\w+Schema)\s*=\s*lazySchema\s*\(/g
const schemas: string[] = []
let match
while ((match = schemaRegex.exec(content)) !== null) {
  schemas.push(match[1])
}

// Generate type names from schema names (e.g., ModelUsageSchema -> ModelUsage)
function schemaToTypeName(schemaName: string): string {
  // Remove "Schema" suffix
  return schemaName.replace(/Schema$/, '')
}

// Build output
let output = `// Auto-generated from coreSchemas.ts\n// Do not edit manually\n\n`
output += `import { z } from 'zod/v4'\n`
output += `import * as schemas from './coreSchemas.js'\n\n`

// Export inferred types for each schema
for (const schema of schemas) {
  const typeName = schemaToTypeName(schema)
  output += `export type ${typeName} = z.infer<ReturnType<typeof schemas.${schema}>>\n`
}

// Add const re-exports for arrays defined in coreSchemas
output += `\n// Re-export const arrays from schemas for runtime usage\n`
output += `export {\n`
output += `  HOOK_EVENTS as HOOK_EVENTS_SCHEMA,\n`
output += `  EXIT_REASONS as EXIT_REASONS_SCHEMA,\n`
output += `  CONFIG_CHANGE_SOURCES,\n`
output += `  INSTRUCTIONS_LOAD_REASONS,\n`
output += `  INSTRUCTIONS_MEMORY_TYPES,\n`
output += `} from './coreSchemas.js'\n`

writeFileSync(outputPath, output)
console.log(`Generated ${schemas.length} types in ${outputPath}`)
