// タブの重複をチェックし、必要に応じて確認ダイアログを表示する関数
function handleTab(url, newTabId) {
  if (!url) return;

  chrome.tabs.query({}, function (tabs) {
    for (let existingTab of tabs) {
      if (existingTab.url === url && existingTab.id !== newTabId) {
        // 重複が検出された場合、確認ダイアログを表示するためにコンテントスクリプトを挿入
        chrome.scripting.executeScript(
          {
            target: { tabId: newTabId },
            func: showConfirmDialog,
          },
          (results) => {
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError);
            }
          }
        );
        break;
      }
    }
  });
}

// コンテントスクリプトとして実行される関数
function showConfirmDialog() {
  const userConfirmed = confirm(
    "このURLは既に開かれています。新しいタブを閉じて既存のタブに移動しますか？"
  );
  // メッセージをバックグラウンドに送信
  chrome.runtime.sendMessage({
    closeTab: userConfirmed,
    url: window.location.href,
  });
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.closeTab !== undefined && message.url) {
    if (message.closeTab) {
      // ユーザーが「OK」を選択した場合
      // 既存のタブに移動
      chrome.tabs.query({ url: message.url }, function (tabs) {
        if (tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, { active: true });
          chrome.windows.update(tabs[0].windowId, { focused: true });
        }
      });
      // 新しいタブを閉じる
      chrome.tabs.remove(sender.tab.id);
    }
  }
});

// タブが作成されたときのリスナー
chrome.tabs.onCreated.addListener(function (tab) {
  handleTab(tab.url, tab.id);
});

// タブが更新されたときのリスナー
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.url) {
    handleTab(changeInfo.url, tabId);
  }
});
