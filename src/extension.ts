// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const rangeProvider = vscode.languages.registerFoldingRangeProvider('velocity', new VelocityRangeProvider());
  context.subscriptions.push(rangeProvider);
}
// this method is called when your extension is deactivated
export function deactivate() { }

class VelocityRange {
  start: number;
  end?: number;
  type: string;

  constructor(type: string, start: number, end: number = null) {
    this.type = type;
    this.start = start;
    this.end = end;
  }
}

class VelocityRangeProvider implements vscode.FoldingRangeProvider {
  provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.FoldingRange[] {
    return this.createRanges(document)
      .filter(r => r.end !== null && r.start !== r.end)
      .map(r => new vscode.FoldingRange(r.start, r.end));
  }

  createRanges(document: vscode.TextDocument): Array<VelocityRange> {
    const ranges: Array<VelocityRange> = [];
    const completedRanges: Array<VelocityRange> = [];
    for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
      const l = document.lineAt(lineNumber);
      if (!l.isEmptyOrWhitespace) {
        const stripedLine = l.text.substring(l.firstNonWhitespaceCharacterIndex);
        // Ignore comment
        if (/^\#\#/g.test(stripedLine)) continue;

        const tokenRegex = /\#\{?(macro|elseif\s*\(|else|if\s*\(|foreach\s*\(|end)/g;
        const matches = stripedLine.match(tokenRegex) || [];
        matches.forEach((match) => {
          // Remove #, {, ( and white spaces
          match = match.replace(/\#|\{|\s|\(/g, "");

          // Handle start token
          const startToken = /macro|^(?!else)if|foreach/g.exec(match);
          if (startToken) {
            ranges.push(new VelocityRange(startToken[0], lineNumber));
          } else if (match == "elseif" || match == "else") {
            // Close the last range
            if (ranges.length > 0) {
              const lastRange = ranges[ranges.length - 1];
              if (/if|elseif/g.test(lastRange.type) && lastRange.end === null) {
                lastRange.end = lineNumber - 1;
                completedRanges.push(ranges.pop());
              }
            }

            // Create a new Range
            ranges.push(new VelocityRange(match, lineNumber));
          } else if (match == "end" && ranges.length > 0) {
            const lastRange = ranges[ranges.length - 1];
            if (lastRange.end === null) {
              lastRange.end = lineNumber - 1;
              completedRanges.push(ranges.pop());
            }
          }
        });
      }
    }

    return completedRanges;
  }
}
