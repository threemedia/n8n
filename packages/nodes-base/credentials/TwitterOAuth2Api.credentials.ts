import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = ['tweet.read', 'users.read'];
export class TwitterOAuth2Api implements ICredentialType {
	name = 'twitterOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Twitter OAuth2 API';

	documentationUrl = 'twitter';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'pkce',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://twitter.com/i/oauth2/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.twitter.com/2/oauth2/token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'offline.access',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: `scope=${scopes.join(' ')}`,
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
