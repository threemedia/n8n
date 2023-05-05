import type { InsertResult, MigrationContext, ReversibleMigration } from '@db/types';
import { v4 as uuid } from 'uuid';
import { loadSurveyFromDisk } from '@db/utils/migrationHelpers';

export class CreateUserManagement1646992772331 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix, schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('role')
			.withColumns(
				column('id').int.primary.autoGenerate,
				column('name').varchar(32).notNull,
				column('scope').varchar(255).notNull,
			)
			.withTimestamps.withIndexOn(['scope', 'name'], true);

		await createTable('user')
			.withColumns(
				column('id').uuid.primary.autoGenerate,
				column('email').varchar(255),
				column('firstName').varchar(32),
				column('lastName').varchar(32),
				column('password').varchar(255),
				column('resetPasswordToken').varchar(255),
				column('resetPasswordTokenExpiration').int,
				column('personalizationAnswers').text,
				column('globalRoleId').int.notNull,
			)
			.withTimestamps.withIndexOn('email', true)
			.withForeignKey('globalRoleId', { tableName: 'role', columnName: 'id' });

		await createTable('shared_workflow')
			.withColumns(
				column('roleId').int.notNull,
				column('userId').uuid.notNull.primary,
				column('workflowId').int.notNull.primary,
			)
			.withTimestamps.withForeignKey('roleId', { tableName: 'role', columnName: 'id' })
			.withForeignKey('userId', { tableName: 'user', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn('workflowId');

		await createTable('shared_credentials')
			.withColumns(
				column('roleId').int.notNull,
				column('userId').uuid.notNull.primary,
				column('credentialsId').int.notNull.primary,
			)
			.withTimestamps.withForeignKey('roleId', { tableName: 'role', columnName: 'id' })
			.withForeignKey('userId', { tableName: 'user', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('credentialsId', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn('credentialsId');

		await createTable('settings').withColumns(
			column('key').varchar(255).primary,
			column('value').text.notNull,
			column('loadOnStartup').bool.notNull.default(false),
		);

		// Insert initial roles
		await queryRunner.query(
			`INSERT INTO ${tablePrefix}role (name, scope) VALUES ('owner', 'global');`,
		);

		const instanceOwnerRole = (await queryRunner.query(
			'SELECT lastval() as "insertId"',
		)) as InsertResult;

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}role (name, scope) VALUES ('member', 'global');`,
		);

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}role (name, scope) VALUES ('owner', 'workflow');`,
		);

		const workflowOwnerRole = (await queryRunner.query(
			'SELECT lastval() as "insertId"',
		)) as InsertResult;

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}role (name, scope) VALUES ('owner', 'credential');`,
		);

		const credentialOwnerRole = (await queryRunner.query(
			'SELECT lastval() as "insertId"',
		)) as InsertResult;

		const survey = loadSurveyFromDisk();

		const ownerUserId = uuid();

		await queryRunner.query(
			`INSERT INTO "${tablePrefix}user" ("id", "globalRoleId", "personalizationAnswers") values ($1, $2, $3)`,
			[ownerUserId, instanceOwnerRole[0].insertId, survey],
		);

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}shared_workflow ("createdAt", "updatedAt", "roleId", "userId", "workflowId") select
				NOW(), NOW(), '${workflowOwnerRole[0].insertId}', '${ownerUserId}', "id" FROM ${tablePrefix}workflow_entity`,
		);

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}shared_credentials ("createdAt", "updatedAt", "roleId", "userId", "credentialsId")   SELECT NOW(), NOW(), '${credentialOwnerRole[0].insertId}', '${ownerUserId}', "id" FROM ${tablePrefix}credentials_entity`,
		);

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}settings ("key", "value", "loadOnStartup") VALUES ('userManagement.isInstanceOwnerSetUp', 'false', true), ('userManagement.skipInstanceOwnerSetup', 'false', true)`,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('settings');
		await dropTable('shared_credentials');
		await dropTable('shared_workflow');
		await dropTable('user');
		await dropTable('role');
	}
}
