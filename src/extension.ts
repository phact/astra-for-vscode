import * as vscode from 'vscode';
import { getToken } from './astra/dataApi';
import { ClustersProvider } from './providers/clusters';
import * as path from 'path';
import * as fs from 'fs';
import { ViewTableCommand } from './commands/ViewTableCommand';

export async function setUpTreeView(context: vscode.ExtensionContext) {
  const { authToken }: any = await getToken(context);
    const clusterProvider = new ClustersProvider(authToken, context);
    vscode.window.registerTreeDataProvider('clusters', clusterProvider);
    vscode.window.createTreeView('clusters', {treeDataProvider: clusterProvider});
    vscode.commands.registerCommand('clusters.viewTable', ViewTableCommand);
    vscode.commands.registerCommand('clusters.deleteEntry', async (item) => {
      await context.globalState.update('astra', null);
      await clusterProvider.refresh();
    });
};

export async function validateInput(body) {
  const errors = [];
  if (!body.id) {
    errors.push('Missing database id.');
  }
  if (!body.region) {
    errors.push('Missing database region.');
  }

  if (!body.username) {
    errors.push('Missing database username.');
  }

  if (!body.password) {
    errors.push('Missing database password.');
  }

  if (errors.length === 0) {
    return true;
  }
  vscode.window.showErrorMessage(`ERROR: ${errors.join('\n')}`);
  return false;
}

export async function activate(context: vscode.ExtensionContext) {
  const astraStorage: any = context.globalState.get('astra');
  await context.globalState.update('astra', null); // TODO: remove

  if (astraStorage && astraStorage.id) {
    await setUpTreeView(context);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('astra.start', async () => {
      const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel('astra', 'Connect to Astra', vscode.ViewColumn.One, {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, 'media'))
        ]
      });
      panel.webview.onDidReceiveMessage(async message => {
        if (message.command === 'credentials') {
          const isValid = validateInput(message.body);

          if (isValid) {
            context.globalState.update('astra', message.body);
            await setUpTreeView(context);
            panel.dispose();
          }
        }
      });
      const filePath: vscode.Uri = vscode.Uri.file(path.join(context.extensionPath, 'src', 'ui', 'addDatabase.html'));
      panel.iconPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'astra-negative-square.png'));
      panel.webview.html = fs.readFileSync(filePath.fsPath, 'utf8');
    })
  );
}
