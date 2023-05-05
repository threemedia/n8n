import type { QueryRunner, TableForeignKeyOptions, TableIndexOptions } from 'typeorm';
import { TableColumn, Table } from 'typeorm';
import { LazyPromise } from 'n8n-workflow';
import { Column } from './Column';

abstract class TableOperation extends LazyPromise<void> {
	abstract execute(queryRunner: QueryRunner): Promise<void>;

	constructor(protected tableName: string, protected prefix: string, queryRunner: QueryRunner) {
		super((resolve) => {
			void this.execute(queryRunner).then(resolve);
		});
	}
}

export class CreateTable extends TableOperation {
	private columns: Column[] = [];

	private indicesOn = new Set<TableIndexOptions>();

	private foreignKeys = new Set<TableForeignKeyOptions>();

	withColumns(...columns: Column[]) {
		this.columns.push(...columns);
		return this;
	}

	get withTimestamps() {
		this.columns.push(
			new Column('createdAt').timestamp(3).notNull.default('NOW()'),
			new Column('updatedAt').timestamp(3).notNull.default('NOW()'),
		);
		return this;
	}

	withIndexOn(columnName: string | string[], isUnique = false) {
		const columnNames = Array.isArray(columnName) ? columnName : [columnName];
		this.indicesOn.add({ columnNames, isUnique });
		return this;
	}

	withForeignKey(
		columnName: string,
		ref: { tableName: string; columnName: string; onDelete?: 'CASCADE'; onUpdate?: 'CASCADE' },
	) {
		const foreignKey: TableForeignKeyOptions = {
			columnNames: [columnName],
			referencedTableName: `${this.prefix}${ref.tableName}`,
			referencedColumnNames: [ref.columnName],
		};
		if (ref.onDelete) foreignKey.onDelete = ref.onDelete;
		if (ref.onUpdate) foreignKey.onUpdate = ref.onUpdate;
		this.foreignKeys.add(foreignKey);
		return this;
	}

	async execute(queryRunner: QueryRunner) {
		const { driver } = queryRunner.connection;
		const { columns, tableName: name, prefix, indicesOn, foreignKeys } = this;
		return queryRunner.createTable(
			new Table({
				name: `${prefix}${name}`,
				columns: columns.map((c) => c.toOptions(driver)),
				...(indicesOn.size ? { indices: [...indicesOn] } : {}),
				...(foreignKeys.size ? { foreignKeys: [...foreignKeys] } : {}),
				...('mysql' in driver ? { engine: 'InnoDB' } : {}),
			}),
			true,
		);
	}
}

export class DropTable extends TableOperation {
	async execute(queryRunner: QueryRunner) {
		const { tableName: name, prefix } = this;
		return queryRunner.dropTable(`${prefix}${name}`, true);
	}
}

export class AddColumns extends TableOperation {
	constructor(
		tableName: string,
		protected columns: Column[],
		prefix: string,
		queryRunner: QueryRunner,
	) {
		super(tableName, prefix, queryRunner);
	}

	async execute(queryRunner: QueryRunner) {
		const { driver } = queryRunner.connection;
		const { tableName, prefix, columns } = this;
		return queryRunner.addColumns(
			`${prefix}${tableName}`,
			columns.map((c) => new TableColumn(c.toOptions(driver))),
		);
	}
}

export class DropColumns extends TableOperation {
	constructor(
		tableName: string,
		protected columnNames: string[],
		prefix: string,
		queryRunner: QueryRunner,
	) {
		super(tableName, prefix, queryRunner);
	}

	async execute(queryRunner: QueryRunner) {
		const { tableName, prefix, columnNames } = this;
		return queryRunner.dropColumns(`${prefix}${tableName}`, columnNames);
	}
}
