import type { MigrationContext, ReversibleMigration } from '@db/types';

export class CreateUserManagement implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {}

	async down({ schemaBuilder: { dropIndex, createIndex } }: MigrationContext) {}
}
