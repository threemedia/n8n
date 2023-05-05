import type { QueryRunner } from 'typeorm';
import { Column } from './Column';
import { AddColumns, CreateTable, DropColumns, DropTable } from './Table';
import { CreateIndex, DropIndex } from './Indices';

export const createSchemaBuilder = (tablePrefix: string, queryRunner: QueryRunner) => ({
	column: (name: string) => new Column(name),
	/* eslint-disable @typescript-eslint/promise-function-async */
	// NOTE: Do not add `async` to these functions, as that messes up the lazy-evaluation of LazyPromise
	createTable: (name: string) => new CreateTable(name, tablePrefix, queryRunner),
	dropTable: (name: string) => new DropTable(name, tablePrefix, queryRunner),
	createIndex: (name: string, tableName: string, columnNames: string[]) =>
		new CreateIndex(name, tableName, columnNames, tablePrefix, queryRunner),
	dropIndex: (name: string, tableName: string) =>
		new DropIndex(name, tableName, tablePrefix, queryRunner),
	addColumns: (tableName: string, columns: Column[]) =>
		new AddColumns(tableName, columns, tablePrefix, queryRunner),
	dropColumns: (tableName: string, columnNames: string[]) =>
		new DropColumns(tableName, columnNames, tablePrefix, queryRunner),
	/* eslint-enable */
});
