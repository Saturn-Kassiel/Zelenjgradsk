const SPREADSHEET_ID = '16dKnOxt6RnSxsbo9MnIFsZw7NN2-OXbM0H5vJAerO0A';
const TG_TOKEN = '8636814373:AAFqnINQNOjrEIrdIrjFBwk3RcfeKD6B7gc';
const TG_CHAT_ID = '-1003706849646';
const GROQ_KEY = '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';
const ADMIN_PASSWORD = '1239940';
const API_BASE = 'https://api.aparts-baltika.ru/api';

const SYSTEM_PROMPT = `Резервный промпт — используется если сервер недоступен.
Ты — Алина, помощник по апартаментам Балтики. Отвечай коротко и по делу.`;

function sendTelegram(text) {
  if (!text || !text.trim()) return;
  UrlFetchApp.fetch('https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: TG_CHAT_ID, text: text }),
    muteHttpExceptions: true
  });
}

function testTelegram() {
  sendTelegram('Тест уведомления работает!');
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    // ── CHAT ──────────────────────────────────────────────
    if (action === 'chat') {
      const messages = data.messages || [];
      let dynamicPrompt = SYSTEM_PROMPT;
      try {
        // Читаем prompt_settings с REST API (данные из админки сайта)
        const psResponse = UrlFetchApp.fetch(API_BASE + '/prompt_settings', {
          muteHttpExceptions: true
        });
        const psData = JSON.parse(psResponse.getContentText());
        const settings = {};
        (psData.data || []).forEach(row => {
          if (row.key) settings[row.key] = row.value || '';
        });

        // Объекты читаем из Google Sheets
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const prSheet = ss.getSheetByName('objects');
        let objectsText = '';
        if (prSheet) {
          const prRows = prSheet.getDataRange().getValues();
          const headers = prRows[0];
          prRows.slice(1).filter(r => r[0]).forEach((r, i) => {
            const p = {};
            headers.forEach((h, idx) => p[String(h).trim()] = r[idx]);
            objectsText += `${i+1}. «${p.name}» — ${p.description || ''}, до ${p.guests || '?'} гостей, ${p.price || '?'} ₽/ночь.\n`;
          });
        }

        dynamicPrompt = `Ты — Алина, помощник по апартаментам Балтики.

ХАРАКТЕР:
${settings.character || ''}

СТИЛЬ ОТВЕТОВ:
${settings.style || ''}

ОБЪЕКТЫ:
${objectsText || 'данные уточняются'}

ЗАЕЗД/ВЫЕЗД: ${settings.checkin || ''}
ВКЛЮЧЕНО: ${settings.includes || ''}
ПАРКОВКА: ${settings.parking || ''}
ЖИВОТНЫЕ: ${settings.pets || ''}
КОЛИЧЕСТВО ГОСТЕЙ: ${settings.guests_policy || ''}

ЛОКАЦИЯ:
${settings.location || ''}

ИНФРАСТРУКТУРА РЯДОМ:
Заря: ${settings.nearby_1 || ''}
Янтарный закат: ${settings.nearby_2 || ''}

ОПЛАТА:
${settings.payment || ''}

ОТМЕНА БРОНИРОВАНИЯ:
${settings.cancellation || ''}

ПРАВИЛА ВЫЕЗДА:
${settings.checkout_rules || ''}

ЭКСТРЕННЫЕ КОНТАКТЫ:
${settings.emergency || ''}

КОГДА ПЕРЕДАВАТЬ ЧЕЛОВЕКУ:
${settings.escalate || ''}
Скажи: «Сейчас передам администратору, он напишет вам в ближайшее время.» и больше ничего не добавляй.`;
      } catch(promptErr) {
        sendTelegram('Ошибка загрузки промпта: ' + promptErr.toString());
      }

      const groqMessages = [{ role: 'system', content: dynamicPrompt }, ...messages];
      const response = UrlFetchApp.fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + GROQ_KEY
        },
        payload: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 600,
          messages: groqMessages
        }),
        muteHttpExceptions: true
      });
      const result = JSON.parse(response.getContentText());
      if (result.error) return response_({error: result.error.message});
      const reply = result.choices && result.choices[0] ? result.choices[0].message.content : '';

      try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        let chatsSheet = ss.getSheetByName('chats');
        if (!chatsSheet) {
          chatsSheet = ss.insertSheet('chats');
          chatsSheet.appendRow(['дата', 'время', 'вопрос гостя', 'ответ бота', 'сообщений в диалоге']);
          chatsSheet.setFrozenRows(1);
        }
        const lastUserMsg = messages.filter(m => m.role === 'user').slice(-1)[0];
        const now = new Date();
        const date = Utilities.formatDate(now, 'Europe/Kaliningrad', 'dd.MM.yyyy');
        const time = Utilities.formatDate(now, 'Europe/Kaliningrad', 'HH:mm');
        chatsSheet.appendRow([date, time, lastUserMsg ? lastUserMsg.content : '—', reply, messages.length]);
      } catch(logErr) {}

      if (reply.includes('передам администратору')) {
        const lastUserMsg = messages.filter(m => m.role === 'user').slice(-1)[0];
        sendTelegram('💬 Чат-бот: гость просит человека\n\nПоследнее сообщение: ' + (lastUserMsg ? lastUserMsg.content : '—'));
      }

      return response_({ok: true, reply: reply});
    }

    // ── NOTIFY ──────────────────────────────────────────────
    if (action === 'notify') {
      const contact = data.contact || '—';
      const dialog = data.dialog || '—';
      sendTelegram('💬 Гость просит человека\n\nКонтакт: ' + contact + '\n\nДиалог:\n' + dialog);
      return response_({ok: true});
    }

    // ── AUTH ──────────────────────────────────────────────
    if (action === 'auth') {
      if (data.password === ADMIN_PASSWORD) {
        return response_({ok: true});
      } else {
        return response_({ok: false});
      }
    }

    // ── SAVE TOKEN ──────────────────────────────────────────
    if (action === 'saveToken') {
      const bookingsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('bookings');
      const rows = bookingsSheet.getDataRange().getValues();
      const headers = rows[0];
      const tokenCol = headers.indexOf('token') + 1;
      if (tokenCol === 0) return response_({error: 'No token column'});
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.bookingId)) {
          bookingsSheet.getRange(i+1, tokenCol).setValue(data.token);
          if (data.memoText) sendTelegram(data.memoText);
          return response_({ok: true});
        }
      }
      return response_({error: 'Booking not found'});
    }

    // ── ОСТАЛЬНЫЕ ACTIONS ──────────────────────────────────
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(data.sheet);
    if (!sheet) return response_({error: 'Sheet not found'});

    if (action === 'append') {
      if (data.sheet === 'bookings') {
        const now = new Date();
        const date = Utilities.formatDate(now, 'Europe/Kaliningrad', 'dd.MM.yyyy');
        const time = Utilities.formatDate(now, 'Europe/Kaliningrad', 'HH:mm');
        data.row.push(date, time);
      }
      sheet.appendRow(data.row);
      if (data.sheet === 'bookings') {
        const lastRow = sheet.getLastRow();
        sheet.getRange(lastRow, 4).setNumberFormat('@');
        sheet.getRange(lastRow, 4).setValue(String(data.row[3]));
        const r = data.row;
        const objName = String(r[1]) === '1' ? 'Заря' : 'Янтарный закат';
        const msg = 'Новая заявка!\n\nГость: ' + r[2] + '\nТелефон: ' + (r[3]||'не указан') + '\nОбъект: ' + objName + '\nЗаезд: ' + r[4] + '\nВыезд: ' + r[5] + '\nГостей: ' + r[6] + (r[9] ? '\nКомментарий: ' + r[9] : '');
        sendTelegram(msg);
      }
      return response_({ok: true});
    }

    if (action === 'update') {
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.id)) {
          data.row.forEach((val, idx) => sheet.getRange(i+1, idx+1).setValue(val));
          return response_({ok: true});
        }
      }
      return response_({error: 'Row not found'});
    }

    if (action === 'updateRow') {
      const rowNum = parseInt(data.rowNum);
      data.row.forEach((val, idx) => sheet.getRange(rowNum, idx+1).setValue(val));
      return response_({ok: true});
    }

    if (action === 'delete') {
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.id)) {
          sheet.deleteRow(i+1);
          return response_({ok: true});
        }
      }
      return response_({error: 'Row not found'});
    }

    if (action === 'read') {
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      const result = rows.slice(1).filter(r => r[0] !== '').map(r => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = r[i]);
        return obj;
      });
      return response_({ok: true, data: result});
    }

    return response_({error: 'Unknown action'});
  } catch(err) {
    sendTelegram('ERROR в doPost: ' + err.toString());
    return response_({error: err.toString()});
  }
}

function doGet(e) {
  if (e.parameter.payload) {
    try {
      const fakeEvent = { postData: { contents: decodeURIComponent(e.parameter.payload) } };
      return doPost(fakeEvent);
    } catch(err) {
      return response_({error: err.toString()});
    }
  }

  if (e.parameter.action === 'checkToken') {
    try {
      const token = e.parameter.token;
      const objId = e.parameter.objId;
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const bookingsSheet = ss.getSheetByName('bookings');
      if (!bookingsSheet) return response_({error: 'bookings not found'});
      const bRows = bookingsSheet.getDataRange().getValues();
      const bHeaders = bRows[0].map(h => String(h).trim());
      const tokenCol = bHeaders.indexOf('token');
      let valid = false;
      for (let i = 1; i < bRows.length; i++) {
        if (String(bRows[i][tokenCol]).trim() === String(token).trim()) {
          valid = true; break;
        }
      }
      if (!valid) return response_({ok: false});
      const objSheet = ss.getSheetByName('objects');
      if (!objSheet) return response_({error: 'objects not found'});
      const pRows = objSheet.getDataRange().getValues();
      const pHeaders = pRows[0].map(h => String(h).trim());
      for (let i = 1; i < pRows.length; i++) {
        if (String(pRows[i][0]) === String(objId)) {
          const prop = {};
          pHeaders.forEach((h, idx) => prop[h] = pRows[i][idx]);
          return response_({ok: true, property: prop});
        }
      }
      return response_({ok: false});
    } catch(err) {
      return response_({error: err.toString()});
    }
  }

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(e.parameter.sheet);
  if (!sheet) return response_({error: 'Sheet not found'});
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const result = rows.slice(1).filter(r => r[0] !== '').map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
  return response_({ok: true, data: result});
}

function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

function response_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function testSimple() {
  Logger.log('test');
}
