/**
 * ChatWidget — единый виджет чата для всех страниц
 * Использование:
 *   ChatWidget.init({ appsUrl, chatUrl, objId })         — фиксированный объект
 *   ChatWidget.init({ appsUrl, chatUrl, getObjId })      — динамический объект
 */

var ChatWidget = (function() {

  var cfg = { appsUrl: '', objId: '1', getObjId: null };
  var cwHistory = [];
  var cwOpen = false;
  var cwWaitingContact = false;

  // ── CSS ──
  var CSS = `
#chat-widget-btn {
  position: fixed; bottom: 28px; right: 28px; z-index: 1000;
  width: 60px; height: 60px; border-radius: 50%;
  background: linear-gradient(135deg, #3E7057 0%, #5269AB 100%);
  border: none; cursor: pointer;
  box-shadow: 0 4px 24px rgba(62,112,87,0.35);
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.2s, box-shadow 0.2s;
  overflow: visible;
}
#chat-widget-btn:hover { transform: scale(1.08); box-shadow: 0 6px 32px rgba(62,112,87,0.45); }
#chat-widget-btn.has-unread::after {
  content: '';
  position: absolute; top: -2px; right: -2px;
  width: 14px; height: 14px; border-radius: 50%;
  background: #E05252; border: 2px solid white;
  z-index: 1001;
  animation: cwBadgePop 0.3s cubic-bezier(0.175,0.885,0.32,1.275);
}
@keyframes cwBadgePop { 0% { transform: scale(0); } 100% { transform: scale(1); } }
#chat-widget-btn svg { transition: opacity 0.2s; }
#chat-widget-btn .icon-close { display: none; }

#chat-widget-box {
  position: fixed; bottom: 100px; right: 28px; z-index: 1000;
  width: 380px; height: 560px;
  background: #F4F6FB; border-radius: 24px;
  box-shadow: 0 16px 56px rgba(46,56,77,0.16);
  display: none; flex-direction: column; overflow: hidden;
  border: 1px solid #CAD5F0;
  animation: cwSlideIn 0.25s ease;
}
@keyframes cwSlideIn { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:none; } }
#chat-widget-box.open { display: flex; }

#cw-header {
  padding: 16px 18px;
  background: linear-gradient(135deg, #3E7057 0%, #5269AB 100%);
  display: flex; align-items: center; gap: 10px; flex-shrink: 0;
}
.cw-av { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cw-info { flex: 1; }
.cw-name { font-family: Manrope, sans-serif; font-size: 14px; font-weight: 700; color: white; }
.cw-sub { font-size: 11px; color: rgba(255,255,255,0.75); display: flex; align-items: center; gap: 5px; margin-top: 2px; }
.cw-dot { width: 7px; height: 7px; border-radius: 50%; background: #B8F5D2; display: inline-block; }
.cw-close { width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.15); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

#cw-messages {
  flex: 1; overflow-y: auto; padding: 16px 14px; display: flex; flex-direction: column; gap: 8px;
}
.cw-msg { display: flex; }
.cw-msg.user { justify-content: flex-end; }
.cw-msg.bot { justify-content: flex-start; }
.cw-bubble {
  max-width: 82%; padding: 10px 14px; border-radius: 18px;
  font-family: DM Sans, sans-serif; font-size: 14px; line-height: 1.5; word-break: normal; overflow-wrap: break-word;
}
.cw-msg.user .cw-bubble { background: #3E7057; color: white; border-bottom-right-radius: 4px; }
.cw-msg.bot .cw-bubble { background: white; color: #2E384D; border-bottom-left-radius: 4px; box-shadow: 0 1px 4px rgba(46,56,77,0.08); }
.cw-typing { color: #6B7A99 !important; font-style: italic; }

#cw-sugs {
  display: flex; flex-wrap: wrap; gap: 6px; padding: 6px 14px 8px;
}
.cw-sb {
  font-family: DM Sans, sans-serif; font-size: 12px; padding: 6px 14px;
  border-radius: 50px; border: 1.5px solid #CAD5F0; background: white;
  color: #3E7057; cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.cw-sb:hover { background: #3E7057; color: white; border-color: #3E7057; }

#cw-input-row {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; background: white; border-top: 1px solid #E1E5F1; flex-shrink: 0;
}
#cw-inp {
  flex: 1; border: 1.5px solid #E1E5F1; border-radius: 50px;
  padding: 9px 16px; font-family: DM Sans, sans-serif; font-size: 14px;
  color: #2E384D; outline: none; background: #F4F6FB; transition: border-color 0.2s;
}
#cw-inp:focus { border-color: #3E7057; }
#cw-send {
  width: 38px; height: 38px; border-radius: 50%; border: none; flex-shrink: 0;
  background: linear-gradient(135deg, #3E7057, #5269AB);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: transform 0.15s;
}
#cw-send:hover { transform: scale(1.08); }

@media (max-width: 600px) {
  #chat-widget-box {
    position: fixed !important;
    top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
    width: 100% !important; height: 100dvh !important; max-height: 100dvh !important;
    border-radius: 0 !important; z-index: 9999 !important;
  }
  #chat-widget-btn { bottom: 20px; right: 20px; }
  #cw-header { padding: 16px 18px; padding-top: max(16px, env(safe-area-inset-top)); flex-shrink: 0; }
  #cw-messages { flex: 1 1 0; min-height: 0; overflow-y: auto; }
  #cw-sugs { flex-shrink: 0; padding: 8px 12px; gap: 7px; }
  #cw-input-row { flex-shrink: 0; padding: 10px 14px; padding-bottom: max(10px, env(safe-area-inset-bottom)); }
  .cw-bubble { font-size: 16px !important; padding: 12px 16px !important; }
  .cw-sb { font-size: 14px !important; padding: 8px 16px !important; }
  #cw-inp { font-size: 16px !important; padding: 11px 16px !important; }
  #cw-send { width: 44px !important; height: 44px !important; }
}
`;

  // ── HTML ──
  var HTML = `
<button id="chat-widget-btn" onclick="ChatWidget.toggle()" aria-label="Открыть чат">
  <svg class="icon-chat" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  <svg class="icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
</button>

<div id="chat-widget-box">
  <div id="cw-header">
    <div class="cw-av"><img src="https://raw.githubusercontent.com/Saturn-Kassiel/Zelenjgradsk/main/img/city/logo.png" style="width:28px;height:28px;object-fit:contain;border-radius:50%"></div>
    <div class="cw-info">
      <div class="cw-name">Апартаменты Балтики</div>
      <div class="cw-sub"><span class="cw-dot"></span>онлайн · обычно отвечает сразу</div>
    </div>
    <button onclick="ChatWidget.clear()" style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0" title="Очистить чат">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
    </button>
    <button class="cw-close" onclick="ChatWidget.toggle()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>
  <div id="cw-messages"></div>
  <div id="cw-sugs">
    <button class="cw-sb" onclick="ChatWidget.sug(this)">🏠 Что входит в аренду?</button>
    <button class="cw-sb" onclick="ChatWidget.sug(this)">📅 Свободные даты</button>
    <button class="cw-sb" onclick="ChatWidget.sug(this)">💰 Цены и скидки</button>
    <button class="cw-sb" onclick="ChatWidget.sug(this)">📍 Как добраться?</button>
  </div>
  <div id="cw-input-row">
    <input id="cw-inp" type="text" placeholder="Напишите вопрос..." onkeydown="if(event.key==='Enter')ChatWidget.send()"/>
    <button id="cw-send" onclick="ChatWidget.send()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
    </button>
  </div>
</div>
`;

  // ── HELPERS ──
  function el(id) { return document.getElementById(id); }

  function getObjId() {
    if (cfg.getObjId) return String(cfg.getObjId());
    return String(cfg.objId || '1');
  }

  function formatText(text) {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" style="color:#3E7057;text-decoration:underline">$1</a>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" style="color:#3E7057;text-decoration:underline;word-break:break-all">$1</a>');
  }

  function addMsg(text, role, isHtml) {
    var msgs = el('cw-messages');
    var div = document.createElement('div');
    div.className = 'cw-msg ' + role;
    div.innerHTML = '<div class="cw-bubble">' + (isHtml ? text : formatText(text)) + '</div>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    var msgs = el('cw-messages');
    var div = document.createElement('div');
    div.className = 'cw-msg bot'; div.id = 'cw-typ';
    div.innerHTML = '<div class="cw-bubble cw-typing">печатает...</div>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() { var e = el('cw-typ'); if (e) e.remove(); }

  function saveHistory() {
    try { localStorage.setItem('cw_history', JSON.stringify(cwHistory.slice(-20))); } catch(e) {}
  }

  function loadHistory() {
    try {
      var saved = localStorage.getItem('cw_history');
      if (saved) cwHistory = JSON.parse(saved);
    } catch(e) {}
  }

  // ── QUEUE ──
  function checkQueue() {
    var token = (new URLSearchParams(window.location.search)).get('token');
    var key = token && token.length > 8 ? token : getObjId();
    fetch(cfg.appsUrl + '/chat-queue/' + encodeURIComponent(key))
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var rows = d.data || d.messages || [];
        if (d.ok && rows.length) {
          rows.forEach(function(row, i) {
            var msg = typeof row === 'string' ? row : (row.message || '');
            var isHtml = row.is_html || false;
            if (!msg) return;
            setTimeout(function() {
              cwHistory.push({ role: 'assistant', content: msg });
              saveHistory();
              if (cwOpen) {
                addMsg(msg, 'bot', isHtml);
              } else {
                var btn = el('chat-widget-btn');
                if (btn) btn.classList.add('has-unread');
              }
            }, 500 * (i + 1));
          });
        }
      }).catch(function() {});
  }

  // ── INIT ──
  function init() {
    // Inject CSS
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Inject HTML
    var wrap = document.createElement('div');
    wrap.innerHTML = HTML;
    document.body.appendChild(wrap.firstElementChild);
    document.body.appendChild(wrap.firstElementChild);

    // Load history
    loadHistory();

    // Check queue on load (silent — just sets badge)
    setTimeout(function() { checkQueue(); }, 1000);
    // Периодический опрос очереди каждые 30 секунд
    setInterval(function() { checkQueue(); }, 30000);
  }

  // ── PUBLIC API ──
  return {
    init: function(options) {
      cfg.appsUrl = options.appsUrl || '';

      cfg.objId = String(options.objId || '1');
      cfg.getObjId = options.getObjId || null;

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    },

    toggle: function() {
      cwOpen = !cwOpen;
      var box = el('chat-widget-box');
      var btn = el('chat-widget-btn');
      box.classList.toggle('open', cwOpen);
      btn.querySelector('.icon-chat').style.display = cwOpen ? 'none' : 'block';
      btn.querySelector('.icon-close').style.display = cwOpen ? 'block' : 'none';
      if (window.innerWidth <= 600) {
        document.body.style.overflow = cwOpen ? 'hidden' : '';
        document.body.style.position = cwOpen ? 'fixed' : '';
        document.body.style.width = cwOpen ? '100%' : '';
      }
      if (cwOpen) {
        var msgs = el('cw-messages');
        var rendered = msgs.querySelectorAll('.cw-msg').length;
        if (rendered === 0) {
          this._renderHistory();
        } else if (rendered < cwHistory.length) {
          for (var i = rendered; i < cwHistory.length; i++) {
            if (cwHistory[i]) addMsg(cwHistory[i].content, cwHistory[i].role === 'user' ? 'user' : 'bot');
          }
        }
        btn.classList.remove('has-unread');
        checkQueue();
      }
    },

    open: function() { if (!cwOpen) this.toggle(); },

    _renderHistory: function() {
      if (cwHistory.length > 0) {
        cwHistory.forEach(function(m) {
          addMsg(m.content, m.role === 'user' ? 'user' : 'bot');
        });
      } else {
        addMsg('Привет! 👋 Если есть вопросы по апартаментам — спрашивайте, расскажу всё честно 🌊', 'bot');
      }
    },

    clear: function() {
      cwHistory = [];
      try { localStorage.removeItem('cw_history'); } catch(e) {}
      el('cw-messages').innerHTML = '';
      addMsg('Привет! 👋 Если есть вопросы по апартаментам — спрашивайте, расскажу всё честно 🌊', 'bot');
    },

    sug: function(btn) {
      el('cw-inp').value = btn.textContent.trim();
      this.send();
    },

    send: async function() {
      var inp = el('cw-inp');
      var text = inp.value.trim();
      if (!text) return;
      inp.value = '';
      addMsg(text, 'user');

      // Скрываем подсказки
      var sugs = el('cw-sugs');
      if (sugs && window.innerWidth <= 600) sugs.style.display = 'none';

      // Режим ожидания контакта
      if (cwWaitingContact) {
        var digits = text.replace(/\D/g, '');
        var hasUsername = text.indexOf('@') !== -1;
        var hasWhatsapp = /whatsapp|вотсап|ватсап/i.test(text);
        var hasPhone = digits.length >= 10;
        if (!hasUsername && !hasPhone) {
          addMsg(hasWhatsapp
            ? 'Напишите номер для WhatsApp — например, +79001234567'
            : 'Похоже контакт неполный. Напишите номер телефона, @username в Telegram или номер для WhatsApp',
            'bot');
          return;
        }
        cwWaitingContact = false;
        addMsg('Управляющий получил ваш контакт и свяжется в ближайшее время 🙏', 'bot');
        var dialogLines = cwHistory.slice(-10).map(function(m) {
          return (m.role === 'user' ? 'Гость: ' : 'Алина: ') + m.content;
        }).join('\n');
        fetch(cfg.appsUrl + '/chat/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact: text, dialog: dialogLines })
        }).catch(function() {});
        return;
      }

      cwHistory.push({ role: 'user', content: text });
      showTyping();

      try {
        var res = await fetch(cfg.appsUrl + '/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: cwHistory })
        });
        var rawText = await res.text();
        var data;
        try { data = JSON.parse(rawText); } catch(e) {
          removeTyping();
          addMsg('Не удалось получить ответ. Попробуйте ещё раз.', 'bot');
          return;
        }
        removeTyping();
        if (data.error) { addMsg('Не удалось получить ответ. Напишите нам напрямую.', 'bot'); return; }
        cwHistory.push({ role: 'assistant', content: data.reply });
        addMsg(data.reply, 'bot');
        saveHistory();
        if (!cwOpen) el('chat-widget-btn').classList.add('has-unread');

        if (data.reply && data.reply.includes('передам администратору')) {
          cwWaitingContact = true;
          setTimeout(function() {
            addMsg('Ваш контакт получит только управляющий. Как лучше с вами связаться? (телефон, Telegram или WhatsApp)', 'bot');
          }, 600);
        }
      } catch(e) {
        removeTyping();
        addMsg('Что-то пошло не так. Попробуйте чуть позже.', 'bot');
      }
    },

    // Вызывается после успешного бронирования
    _isOpen: function() { return cwOpen; },
    _addMsg: function(text, role, isHtml) { addMsg(text, role, isHtml); },

    onBookingSuccess: function(name, objName, dateIn, dateOut, nights) {
      var inFmt = dateIn ? dateIn.split('-').reverse().join('.') : '—';
      var outFmt = dateOut ? dateOut.split('-').reverse().join('.') : '—';
      var nw = nights === 1 ? 'ночь' : nights < 5 ? 'ночи' : 'ночей';
      var msg = name + ', ваша заявка принята 🙏\n\n' +
        '🏠 ' + objName + '\n' +
        '📅 ' + inFmt + ' — ' + outFmt + ' (' + nights + ' ' + nw + ')\n\n' +
        'Управляющий свяжется с вами для подтверждения.';
      cwHistory.push({ role: 'assistant', content: msg });
      saveHistory();
      // Открываем чат автоматически через 800мс
      var self = this;
      setTimeout(function() {
        if (cwOpen) {
          // Чат открыт — просто добавляем сообщение
          addMsg(msg, 'bot');
        } else {
          // Открываем чат — toggle вызовет _renderHistory который покажет всю историю включая это сообщение
          self.toggle();
        }
        var msgs = el('cw-messages');
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
      }, 800);
    }
  };

})();
