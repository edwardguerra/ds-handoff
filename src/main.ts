// DS Handoff — entry point and unified UI controller.
//
// One window, two tabs:
//   Component — spec sheet documentation (spec.ts)
//   Tokens    — variables/styles documentation (variables.ts)
//
// Launch routing:
//   "Component Spec" menu item          → Component tab
//   "Variables" menu item               → Tokens tab
//   "Refresh variables" relaunch button → Tokens tab (rewrite flow)
//   "Wrap in auto layout" relaunch      → headless, no UI
import { registerSpecSelectionTracking, handleSpecMessage } from './spec';
import { getTokensInitData, handleTokensConfirm, handleTokensResync, handleCreateAutoLayout } from './variables';

var command = figma.command || '';

if (command === 'create-autolayout') {
  handleCreateAutoLayout();
  figma.closePlugin();
} else {
  var initialTab = (command === 'variables' || command === 'rewrite') ? 'tokens' : 'component';
  var isTokens = initialTab === 'tokens';
  figma.showUI(__html__, { width: isTokens ? 560 : 320, height: isTokens ? 500 : 460 });
  registerSpecSelectionTracking();

  figma.ui.onmessage = function(msg: any) {
    if (!msg || !msg.type) return;

    if (msg.type === 'ui-ready') {
      figma.ui.postMessage({ type: 'set-tab', tab: initialTab });
      figma.ui.postMessage(getTokensInitData());
      return;
    }
    if (msg.type === 'ui-resize') {
      figma.ui.resize(Math.max(240, msg.width | 0), Math.max(240, msg.height | 0));
      return;
    }
    if (msg.type === 'tokens-confirm') {
      handleTokensConfirm(msg);
      return;
    }
    if (msg.type === 'tokens-resync') {
      handleTokensResync();
      return;
    }
    // Component tab messages: generate-specs, resync-specs, clear-specs, close
    handleSpecMessage(msg);
  };
}
