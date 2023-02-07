import { WorkflowPage, NDV, CanvasNode } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();
const canvasNode = new CanvasNode();

describe('Data mapping', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();
		cy.window()
			.then(win => win.onBeforeUnload && win.removeEventListener('beforeunload', win.onBeforeUnload))
	});

	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('maps expressions from table header', () => {
		cy.fixture('Test_workflow-actions_paste-data.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		canvasNode.actions.openNode('Set');
		ndv.actions.executePrevious();
		ndv.actions.switchInputMode('Table');
		ndv.getters.inputDataContainer().get('table', { timeout: 10000 }).should('exist');

		ndv.getters.nodeParameters().find('input[placeholder*="Add Value"]').click();
		ndv.getters.nodeParameters().find('.el-select-dropdown__list li:nth-child(3)').should('have.text', 'String').click();
		ndv.getters.parameterInput('name').should('have.length', 1).find('input').should('have.value', 'propertyName');
		ndv.getters.parameterInput('value').should('have.length', 1).find('input').should('have.value', '');

		ndv.actions.mapDataFromHeader(1, 'value');
		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $json.timestamp }}');

		ndv.actions.mapDataFromHeader(2, 'value');
		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $json.timestamp }} {{ $json["Readable date"] }}');
	});

	it('maps expressions from table json, and resolves value based on hover', () => {
		cy.fixture('Test_workflow-actions_paste-data.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		canvasNode.actions.openNode('Schedule Trigger');
		ndv.actions.setPinnedData([
			{
				input: [
					{
						"hello world": {
							count: 0,
						},
					}
				]
			},
			{
				input: [
					{
						"hello world": {
							count: 1,
						}
					}
				]
			},
		]);
		ndv.actions.close();

		canvasNode.actions.openNode('Set');
		ndv.actions.switchInputMode('Table');
		ndv.getters.inputDataContainer().get('table', { timeout: 10000 }).should('exist');

		ndv.getters.nodeParameters().find('input[placeholder*="Add Value"]').click();
		ndv.getters.nodeParameters().find('.el-select-dropdown__list li:nth-child(3)').should('have.text', 'String').click();
		ndv.getters.parameterInput('name').should('have.length', 1).find('input').should('have.value', 'propertyName');
		ndv.getters.parameterInput('value').should('have.length', 1).find('input').should('have.value', '');

		ndv.getters.inputTbodyCell(1, 0).find('span').contains('count').realMouseDown();
		ndv.actions.mapToParameter('value');
		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $json.input[0]["hello world"].count }}');
		ndv.getters.parameterExpressionPreview('value').should('include.text', '0')

		ndv.getters.inputTbodyCell(1, 0).realHover();
		ndv.getters.parameterExpressionPreview('value')
			.should('include.text', '0')
			.invoke('css', 'color')
			.should('equal', 'rgb(125, 125, 135)');

		ndv.getters.inputTbodyCell(2, 0).realHover();
		ndv.getters.parameterExpressionPreview('value')
				.should('include.text', '1')
				.invoke('css', 'color')
				.should('equal', 'rgb(125, 125, 135)');

		ndv.actions.execute();

		ndv.getters.outputTbodyCell(1, 0).realHover();
		ndv.getters.parameterExpressionPreview('value')
			.should('include.text', '0')
			.invoke('css', 'color')
			.should('equal', 'rgb(125, 125, 135)');

		ndv.getters.outputTbodyCell(2, 0).realHover();
		ndv.getters.parameterExpressionPreview('value')
				.should('include.text', '1')
				.invoke('css', 'color')
				.should('equal', 'rgb(125, 125, 135)');
	});

	it('maps expressions from json view', () => {
		cy.fixture('Test_workflow-actions_paste-data.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		canvasNode.actions.openNode('Schedule Trigger');
		ndv.actions.setPinnedData([
			{
				input: [
					{
						"hello world": {
							count: 0,
						},
					}
				]
			},
			{
				input: [
					{
						"hello world": {
							count: 1,
						}
					}
				]
			},
		]);
		ndv.actions.close();

		canvasNode.actions.openNode('Set');
		ndv.actions.switchInputMode('JSON');
		ndv.getters.inputDataContainer().should('exist');

		ndv.getters.nodeParameters().find('input[placeholder*="Add Value"]').click();
		ndv.getters.nodeParameters().find('.el-select-dropdown__list li:nth-child(3)').should('have.text', 'String').click();
		ndv.getters.parameterInput('name').should('have.length', 1).find('input').should('have.value', 'propertyName');
		ndv.getters.parameterInput('value').should('have.length', 1).find('input').should('have.value', '');

		ndv.getters.inputDataContainer().find('.json-data')
			.should('have.text', '[{"input":[{"hello world":{"count":0}}]},{"input":[{"hello world":{"count":1}}]}]')
			.find('span').contains('"count"')
			.realMouseDown();

		ndv.actions.mapToParameter('value');
		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $json.input[0]["hello world"].count }}');
		ndv.getters.parameterExpressionPreview('value')
			.should('include.text', '0');

		ndv.getters.inputDataContainer().find('.json-data')
			.find('span').contains('"input"')
			.realMouseDown();

		ndv.actions.mapToParameter('value');
		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $json.input[0]["hello world"].count }} {{ $json.input }}');
		ndv.getters.parameterExpressionPreview('value')
			.should('include.text', '0 [object Object]');
	});

	it('maps expressions from schema view', () => {
		workflowPage.actions.visit();
		cy.fixture('Test_workflow-actions_paste-data.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		canvasNode.actions.openNode('Schedule Trigger');
		ndv.actions.setPinnedData([
			{
				input: [
					{
						"hello world": {
							count: 0,
						},
					}
				]
			},
			{
				input: [
					{
						"hello world": {
							count: 1,
						}
					}
				]
			},
		]);
		ndv.actions.close();

		canvasNode.actions.openNode('Set');
		ndv.getters.inputDataContainer().should('exist');

		ndv.getters.nodeParameters().find('input[placeholder*="Add Value"]').click();
		ndv.getters.nodeParameters().find('.el-select-dropdown__list li:nth-child(3)').should('have.text', 'String').click();
		ndv.getters.parameterInput('name').should('have.length', 1).find('input').should('have.value', 'propertyName');
		ndv.getters.parameterInput('value').should('have.length', 1).find('input').should('have.value', '');

		ndv.getters.inputDataContainer()
			.find('span').contains('count')
			.realMouseDown();

		ndv.actions.mapToParameter('value');
		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $json.input[0]["hello world"].count }}');
		ndv.getters.parameterExpressionPreview('value')
			.should('include.text', '0');

		ndv.getters.inputDataContainer()
			.find('span').contains('input')
			.realMouseDown();

		ndv.actions.mapToParameter('value');
		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $json.input[0]["hello world"].count }} {{ $json.input }}');
		ndv.getters.parameterExpressionPreview('value')
			.should('include.text', '0 [object Object]');
	});

	it('maps expressions from previous nodes', () => {
		workflowPage.actions.visit();

		cy.createFixtureWorkflow('Test_workflow_3.json', `My test workflow`);

		canvasNode.actions.openNode('Set1');

		ndv.getters.nodeParameters().find('input[placeholder*="Add Value"]').click();
		ndv.getters.nodeParameters().find('.el-select-dropdown__list li:nth-child(3)').should('have.text', 'String').click();

		ndv.actions.selectInputNode('Schedule Trigger');

		ndv.getters.inputDataContainer()
			.find('span').contains('code')
			.realMouseDown();

		ndv.actions.mapToParameter('value');
		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $node["Schedule Trigger"].json.code }}');
		ndv.getters.parameterExpressionPreview('value')
			.should('not.exist');

		ndv.actions.switchInputMode('Table');
		ndv.actions.mapDataFromHeader(1, 'value');
		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $node["Schedule Trigger"].json.code }} {{ $node["Schedule Trigger"].json.name }}');
		ndv.getters.parameterExpressionPreview('value')
			.should('not.exist');

		ndv.actions.selectInputNode('Set');

		ndv.actions.executePrevious();
		ndv.getters.executingLoader().should('not.exist');
		ndv.getters.inputDataContainer().should('exist');
		ndv.getters.parameterExpressionPreview('value')
			.should('include.text', '1 First item');
	});

});