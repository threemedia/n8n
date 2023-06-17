import { Service } from 'typedi';
import { readFileSync as fsReadFileSync, existsSync as fsExistsSync } from 'fs';
import { writeFile as fsWriteFile, rm as fsRm } from 'fs/promises';
import path from 'path';
import type { ValidationError } from 'class-validator';
import { validate } from 'class-validator';

import { UserSettings } from 'n8n-core';
import { LoggerProxy, jsonParse } from 'n8n-workflow';

import {
	generateSshKeyPair,
	isVersionControlLicensed,
	versionControlFoldersExistCheck,
} from './versionControlHelper.ee';
import { VersionControlPreferences } from './types/versionControlPreferences';
import {
	VERSION_CONTROL_SSH_FOLDER,
	VERSION_CONTROL_GIT_FOLDER,
	VERSION_CONTROL_SSH_KEY_NAME,
	VERSION_CONTROL_PREFERENCES_DB_KEY,
} from './constants';
import { SettingsRepository } from '@/databases/repositories';

@Service()
export class VersionControlPreferencesService {
	private _versionControlPreferences: VersionControlPreferences = new VersionControlPreferences();

	readonly sshKeyName: string;

	readonly sshFolder: string;

	readonly gitFolder: string;

	constructor(private readonly settingsRepository: SettingsRepository) {
		const userFolder = UserSettings.getUserN8nFolderPath();
		this.sshFolder = path.join(userFolder, VERSION_CONTROL_SSH_FOLDER);
		this.gitFolder = path.join(userFolder, VERSION_CONTROL_GIT_FOLDER);
		this.sshKeyName = path.join(this.sshFolder, VERSION_CONTROL_SSH_KEY_NAME);
	}

	public get versionControlPreferences(): VersionControlPreferences {
		return {
			...this._versionControlPreferences,
			connected: this._versionControlPreferences.connected ?? false,
			publicKey: this.getPublicKey(),
		};
	}

	public set versionControlPreferences(preferences: Partial<VersionControlPreferences>) {
		this._versionControlPreferences = VersionControlPreferences.merge(
			preferences,
			this._versionControlPreferences,
		);
	}

	getPublicKey(): string {
		try {
			return fsReadFileSync(this.sshKeyName + '.pub', { encoding: 'utf8' });
		} catch (error) {
			LoggerProxy.error(`Failed to read public key: ${(error as Error).message}`);
		}
		return '';
	}

	hasKeyPairFiles(): boolean {
		return fsExistsSync(this.sshKeyName) && fsExistsSync(this.sshKeyName + '.pub');
	}

	async deleteKeyPairFiles(): Promise<void> {
		try {
			await fsRm(this.sshFolder, { recursive: true });
		} catch (error) {
			LoggerProxy.error(`Failed to delete ssh folder: ${(error as Error).message}`);
		}
	}

	/**
	 * Will generate an ed25519 key pair and save it to the database and the file system
	 * Note: this will overwrite any existing key pair
	 */
	async generateAndSaveKeyPair(): Promise<VersionControlPreferences> {
		versionControlFoldersExistCheck([this.gitFolder, this.sshFolder]);
		const keyPair = generateSshKeyPair('ed25519');
		if (keyPair.publicKey && keyPair.privateKey) {
			try {
				await fsWriteFile(this.sshKeyName + '.pub', keyPair.publicKey, {
					encoding: 'utf8',
					mode: 0o666,
				});
				await fsWriteFile(this.sshKeyName, keyPair.privateKey, { encoding: 'utf8', mode: 0o600 });
			} catch (error) {
				throw Error(`Failed to save key pair: ${(error as Error).message}`);
			}
		}
		return this.getPreferences();
	}

	isBranchReadOnly(): boolean {
		return this._versionControlPreferences.branchReadOnly;
	}

	isVersionControlConnected(): boolean {
		return this.versionControlPreferences.connected;
	}

	isVersionControlLicensedAndEnabled(): boolean {
		return this.isVersionControlConnected() && isVersionControlLicensed();
	}

	getBranchName(): string {
		return this.versionControlPreferences.branchName;
	}

	getPreferences(): VersionControlPreferences {
		return this.versionControlPreferences;
	}

	async validateVersionControlPreferences(
		preferences: Partial<VersionControlPreferences>,
		allowMissingProperties = true,
	): Promise<ValidationError[]> {
		const preferencesObject = new VersionControlPreferences(preferences);
		const validationResult = await validate(preferencesObject, {
			forbidUnknownValues: false,
			skipMissingProperties: allowMissingProperties,
			stopAtFirstError: false,
			validationError: { target: false },
		});
		if (validationResult.length > 0) {
			throw new Error(`Invalid version control preferences: ${JSON.stringify(validationResult)}`);
		}
		return validationResult;
	}

	async setPreferences(
		preferences: Partial<VersionControlPreferences>,
		saveToDb = true,
	): Promise<VersionControlPreferences> {
		versionControlFoldersExistCheck([this.gitFolder, this.sshFolder]);
		if (!this.hasKeyPairFiles()) {
			LoggerProxy.debug('No key pair files found, generating new pair');
			await this.generateAndSaveKeyPair();
		}
		this.versionControlPreferences = preferences;
		if (saveToDb) {
			const settingsValue = JSON.stringify(this._versionControlPreferences);
			try {
				await this.settingsRepository.save({
					key: VERSION_CONTROL_PREFERENCES_DB_KEY,
					value: settingsValue,
					loadOnStartup: true,
				});
			} catch (error) {
				throw new Error(`Failed to save version control preferences: ${(error as Error).message}`);
			}
		}
		return this.versionControlPreferences;
	}

	async loadFromDbAndApplyVersionControlPreferences(): Promise<
		VersionControlPreferences | undefined
	> {
		const loadedPreferences = await this.settingsRepository.findOne({
			where: { key: VERSION_CONTROL_PREFERENCES_DB_KEY },
		});
		if (loadedPreferences) {
			try {
				const preferences = jsonParse<VersionControlPreferences>(loadedPreferences.value);
				if (preferences) {
					// set local preferences but don't write back to db
					await this.setPreferences(preferences, false);
					return preferences;
				}
			} catch (error) {
				LoggerProxy.warn(
					`Could not parse Version Control settings from database: ${(error as Error).message}`,
				);
			}
		}
		await this.setPreferences(new VersionControlPreferences(), true);
		return this.versionControlPreferences;
	}
}
