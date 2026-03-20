/**
 * BookingModal — единый компонент формы бронирования
 * Использование:
 *   BookingModal.init({ appsUrl, chatUrl });
 *   BookingModal.open({ objId, objName, objAddr, price, guests, dateIn, dateOut });
 */

var BookingModal = (function() {

  var cfg = { appsUrl: '', chatUrl: '' };
  var state = { objId: null, objName: '', objAddr: '', price: 0, maxGuests: 3, statuses: {} };
  var calState = { year: new Date().getFullYear(), month: new Date().getMonth() };

  // ── HTML ──
  function getHTML() {
    return '<div id="bm-overlay" style="display:none;position:fixed;inset:0;z-index:9000;background:rgba(46,56,77,0.45);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:20px" onclick="BookingModal._bgClose(event)">' +
      '<div id="bm-modal" style="background:white;border-radius:28px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;padding:32px;position:relative;box-shadow:0 24px 80px rgba(46,56,77,0.2)">' +
        '<button onclick="BookingModal.close()" style="position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:50%;border:1.5px solid #E1E5F1;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#6B7A99">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +

        '<!-- Форма -->' +
        '<div id="bm-form-screen">' +
          '<div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#3E7057;margin-bottom:8px">Заявка на бронирование</div>' +
          '<div id="bm-obj-name" style="font-family:Manrope,sans-serif;font-size:20px;font-weight:800;color:#2E384D;margin-bottom:2px"></div>' +
          '<div id="bm-obj-addr" style="font-size:13px;color:#6B7A99;margin-bottom:20px"></div>' +

          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
            '<div><label style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#6B7A99;display:block;margin-bottom:6px">Имя <span style="color:#E05252">*</span></label>' +
              '<input id="bm-name" type="text" placeholder="Имя и фамилия" oninput="this.style.borderColor=\'\'" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid #E1E5F1;border-radius:12px;font-family:DM Sans,sans-serif;font-size:14px;outline:none"></div>' +
            '<div><label style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#6B7A99;display:block;margin-bottom:6px">Телефон <span style="color:#E05252">*</span></label>' +
              '<input id="bm-phone" type="tel" placeholder="+7 (000) 000-00-00" oninput="BookingModal._fmtPhone(this)" maxlength="18" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid #E1E5F1;border-radius:12px;font-family:DM Sans,sans-serif;font-size:14px;outline:none"></div>' +
          '</div>' +

          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
            '<div><label style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#6B7A99;display:block;margin-bottom:6px">Дата заезда <span style="color:#E05252">*</span></label>' +
              '<input id="bm-checkin" type="date" oninput="this.style.borderColor=\'\'" onchange="BookingModal._recalc();BookingModal._calRender()" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid #E1E5F1;border-radius:12px;font-family:DM Sans,sans-serif;font-size:14px;outline:none"></div>' +
            '<div><label style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#6B7A99;display:block;margin-bottom:6px">Дата выезда</label>' +
              '<input id="bm-checkout" type="date" readonly style="width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid #E1E5F1;border-radius:12px;font-family:DM Sans,sans-serif;font-size:14px;outline:none;background:#F4F6FB;color:#6B7A99"></div>' +
          '</div>' +

          '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#F4F6FB;border-radius:10px;border:1px solid #E1E5F1;margin-bottom:12px">' +
            '<span style="font-size:12px;color:#6B7A99;flex-shrink:0">Ночей:</span>' +
            '<button type="button" onclick="BookingModal._nights(-1)" style="width:28px;height:28px;border-radius:6px;border:1.5px solid #E1E5F1;background:white;font-size:16px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center">−</button>' +
            '<input id="bm-nights" type="number" value="3" min="2" max="90" oninput="BookingModal._recalc();BookingModal._calRender()" style="width:70px;text-align:center;font-weight:700;font-family:Manrope,sans-serif;font-size:16px;border:1.5px solid #E1E5F1;border-radius:8px;padding:4px 8px;outline:none">' +
            '<button type="button" onclick="BookingModal._nights(1)" style="width:28px;height:28px;border-radius:6px;border:1.5px solid #E1E5F1;background:white;font-size:16px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center">+</button>' +
            '<span id="bm-nights-label" style="font-size:12px;color:#6B7A99">ночи</span>' +
          '</div>' +

          '<!-- Календарь -->' +
          '<div style="border:1.5px solid #E1E5F1;border-radius:14px;overflow:hidden;margin-bottom:12px">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:#F4F6FB;border-bottom:1px solid #E1E5F1">' +
              '<button type="button" onclick="BookingModal._calPrev()" style="width:26px;height:26px;border:none;background:transparent;cursor:pointer;font-size:16px;color:#6B7A99">‹</button>' +
              '<div id="bm-cal-title" style="font-size:13px;font-weight:600;color:#2E384D"></div>' +
              '<button type="button" onclick="BookingModal._calNext()" style="width:26px;height:26px;border:none;background:transparent;cursor:pointer;font-size:16px;color:#6B7A99">›</button>' +
            '</div>' +
            '<div style="padding:8px">' +
              '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px">' +
                ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(function(d){ return '<div style="text-align:center;font-size:10px;font-weight:600;color:#6B7A99;padding:3px 0">'+d+'</div>'; }).join('') +
              '</div>' +
              '<div id="bm-cal-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px"></div>' +
            '</div>' +
            '<div style="display:flex;gap:12px;padding:6px 14px;border-top:1px solid #E1E5F1;font-size:11px;color:#6B7A99">' +
              '<span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:rgba(62,112,87,0.15);margin-right:4px"></span>Выбрано</span>' +
              '<span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:rgba(224,82,82,0.12);margin-right:4px"></span>Занято</span>' +
            '</div>' +
          '</div>' +

          '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#6B7A99;display:block;margin-bottom:6px">Гостей</label>' +
            '<select id="bm-guests" onchange="BookingModal._recalc()" style="width:100%;padding:11px 14px;border:1.5px solid #E1E5F1;border-radius:12px;font-family:DM Sans,sans-serif;font-size:14px;outline:none;background:white;cursor:pointer"></select>' +
          '</div>' +

          '<!-- Расчёт стоимости -->' +
          '<div id="bm-calc" style="display:none;background:#F4F6FB;border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:13px">' +
            '<div id="bm-calc-rows"></div>' +
          '</div>' +

          '<div style="margin-bottom:16px"><label style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#6B7A99;display:block;margin-bottom:6px">Комментарий (необязательно)</label>' +
            '<textarea id="bm-comment" placeholder="Особые пожелания..." style="width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid #E1E5F1;border-radius:12px;font-family:DM Sans,sans-serif;font-size:14px;outline:none;resize:vertical;min-height:72px"></textarea>' +
          '</div>' +

          '<button onclick="BookingModal._submit()" style="width:100%;padding:15px;border-radius:50px;background:#3E7057;color:white;border:none;cursor:pointer;font-family:DM Sans,sans-serif;font-size:14px;font-weight:600;transition:background 0.2s" onmouseover="this.style.background=\'#325f47\'" onmouseout="this.style.background=\'#3E7057\'">Отправить заявку →</button>' +
          '<div style="margin-top:14px;display:flex;flex-direction:column;gap:10px">' +
            '<label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:12px;color:#6B7A99;line-height:1.5">' +
              '<input id="bm-check-confirm" type="checkbox" style="flex-shrink:0;margin-top:2px;width:16px;height:16px;accent-color:#3E7057;cursor:pointer">' +
              '<span>Бронирование вступает в силу после подтверждения управляющего</span>' +
            '</label>' +
            '<label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:12px;color:#6B7A99;line-height:1.5">' +
              '<input id="bm-check-pd" type="checkbox" style="flex-shrink:0;margin-top:2px;width:16px;height:16px;accent-color:#3E7057;cursor:pointer">' +
              '<span>Я соглашаюсь с <a href="privacy.html" target="_blank" style="color:#3E7057">обработкой персональных данных</a></span>' +
            '</label>' +
            '<div id="bm-check-error" style="display:none;font-size:12px;color:#E05252">⚠️ Необходимо подтвердить оба пункта</div>' +
          '</div>' +
        '</div>' +

        '<!-- Успех -->' +
        '<div id="bm-success-screen" style="display:none;text-align:center;padding:20px 0">' +
          '<div style="width:64px;height:64px;border-radius:50%;background:rgba(62,112,87,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">' +
            '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3E7057" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>' +
          '</div>' +
          '<div style="font-family:Manrope,sans-serif;font-size:22px;font-weight:800;color:#2E384D;margin-bottom:8px">Заявка получена!</div>' +
          '<p style="font-size:14px;color:#6B7A99;line-height:1.6;margin-bottom:20px">Мы свяжемся с вами для подтверждения бронирования.</p>' +
          '<div style="background:rgba(62,112,87,0.07);border-radius:14px;padding:16px 18px;text-align:left;margin-bottom:20px">' +
            '<div style="font-size:13px;font-weight:700;color:#2E384D;margin-bottom:8px">💬 Хотите получить ответ прямо сейчас?</div>' +
            '<div style="font-size:13px;color:#6B7A99;line-height:1.6">Откройте чат внизу страницы и напишите <b style="color:#2E384D">«заявка»</b> — наш помощник Алина сразу подтвердит получение и ответит на вопросы.</div>' +
            '<button onclick="BookingModal._openChat()" style="margin-top:12px;display:flex;align-items:center;gap:8px;background:#3E7057;color:white;border:none;border-radius:50px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
              'Открыть чат с Алиной' +
            '</button>' +
          '</div>' +
          '<button onclick="BookingModal.close()" style="padding:10px 28px;border-radius:50px;border:1.5px solid #E1E5F1;background:transparent;cursor:pointer;font-family:DM Sans,sans-serif;font-size:13px;color:#6B7A99">Закрыть</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ── HELPERS ──
  function nw(n) { return n===1?'ночь':n<5?'ночи':'ночей'; }
  function gw(n) { var a=['','гость','гостя','гостя','гостя','гостей','гостей']; return a[n]||'гостей'; }
  function el(id) { return document.getElementById(id); }

  // ── PUBLIC ──
  return {
    init: function(options) {
      cfg = Object.assign(cfg, options);
      if (!el('bm-overlay')) {
        var div = document.createElement('div');
        div.innerHTML = getHTML();
        document.body.appendChild(div.firstChild);
      }
    },

    open: function(opts) {
      opts = opts || {};
      state.objId = opts.objId || null;
      state.objName = opts.objName || '';
      state.objAddr = opts.objAddr || '';
      state.price = opts.price || 0;
      state.maxGuests = opts.maxGuests || 3;
      state.statuses = opts.statuses || {};

      // Заголовок
      if (el('bm-obj-name')) el('bm-obj-name').textContent = state.objName;
      if (el('bm-obj-addr')) el('bm-obj-addr').textContent = state.objAddr;

      // Гости
      var gOpts = '';
      for (var i = 1; i <= state.maxGuests; i++) {
        var extra = i >= 3 ? ' (+750 ₽/ночь)' : '';
        gOpts += '<option value="'+i+'"'+(i===2?' selected':'')+'>'+i+' '+gw(i)+extra+'</option>';
      }
      if (el('bm-guests')) el('bm-guests').innerHTML = gOpts;

      // Подставляем даты если переданы
      if (opts.dateIn && el('bm-checkin')) {
        el('bm-checkin').value = opts.dateIn;
      }
      if (opts.nights && el('bm-nights')) {
        el('bm-nights').value = opts.nights;
      }

      // Сбрасываем форму/успех
      if (el('bm-form-screen')) el('bm-form-screen').style.display = '';
      if (el('bm-success-screen')) el('bm-success-screen').style.display = 'none';
      if (el('bm-check-confirm')) el('bm-check-confirm').checked = false;
      if (el('bm-check-pd')) el('bm-check-pd').checked = false;
      if (el('bm-check-error')) el('bm-check-error').style.display = 'none';

      // Показываем модал
      var overlay = el('bm-overlay');
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      // Инициализируем
      calState.year = new Date().getFullYear();
      calState.month = new Date().getMonth();
      if (opts.dateIn) {
        calState.year = new Date(opts.dateIn).getFullYear();
        calState.month = new Date(opts.dateIn).getMonth();
      }
      this._recalc();
      this._calRender();
    },

    close: function() {
      var overlay = el('bm-overlay');
      if (overlay) overlay.style.display = 'none';
      document.body.style.overflow = '';
    },

    _bgClose: function(e) {
      if (e.target === el('bm-overlay')) this.close();
    },

    _fmtPhone: function(inp) {
      var v = inp.value.replace(/\D/g,'');
      if (v.startsWith('8')) v = '7'+v.slice(1);
      if (!v.startsWith('7')) v = '7'+v;
      v = v.slice(0,11);
      var r = '+7';
      if (v.length>1) r+=' ('+v.slice(1,4);
      if (v.length>=4) r+=') '+v.slice(4,7);
      if (v.length>=7) r+='-'+v.slice(7,9);
      if (v.length>=9) r+='-'+v.slice(9,11);
      inp.value = r;
    },

    _nights: function(delta) {
      var n = el('bm-nights');
      n.value = Math.max(2, Math.min(90, (parseInt(n.value)||2)+delta));
      this._recalc();
      this._calRender();
    },

    _recalc: function() {
      var dateIn = el('bm-checkin').value;
      var nights = parseInt(el('bm-nights').value)||1;
      if (el('bm-nights-label')) el('bm-nights-label').textContent = nw(nights);
      if (!dateIn) { el('bm-checkout').value = ''; el('bm-calc').style.display='none'; return; }
      var d = new Date(dateIn);
      d.setDate(d.getDate()+nights);
      var dateOut = d.toISOString().split('T')[0];
      el('bm-checkout').value = dateOut;
      calState.year = new Date(dateIn).getFullYear();
      calState.month = new Date(dateIn).getMonth();
      if (!state.price || !state.objId) return;
      var guests = parseInt(el('bm-guests').value)||2;
      var guestSurcharge = guests >= 3 ? 750*nights : 0;
      var self = this;
      fetch(cfg.appsUrl+'/pricing/calculate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ base_price: state.price, date_in: dateIn, date_out: dateOut, obj_id: state.objId })
      }).then(function(r){ return r.json(); }).then(function(pc){
        if (!pc.ok) return;
        var rows = el('bm-calc-rows');
        rows.innerHTML = '';
        if (pc.breakdown && pc.breakdown.length) {
          pc.breakdown.forEach(function(seg){
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px';
            if (seg.type==='promo') {
              row.style.color='#3E7057';
              row.innerHTML='<span>🏷 '+seg.label+': '+seg.price_per_night.toLocaleString('ru')+' ₽ × '+seg.nights+' '+nw(seg.nights)+'</span><span style="flex-shrink:0">'+seg.total.toLocaleString('ru')+' ₽</span>';
            } else {
              var factors=[];
              if (seg.season_coef&&seg.season_coef!==1) factors.push('сезон ×'+seg.season_coef);
              if (seg.surcharge_coef&&seg.surcharge_coef!==1) factors.push((seg.surcharge_label||'период')+' ×'+seg.surcharge_coef);
              var lbl=seg.price_per_night.toLocaleString('ru')+' ₽ × '+seg.nights+' '+nw(seg.nights);
              if (factors.length) lbl+=' ('+factors.join(', ')+')';
              if (seg.discount_pct>0) lbl+=' −'+seg.discount_pct+'% → '+seg.price_after_discount.toLocaleString('ru')+' ₽/н.';
              row.innerHTML='<span>'+lbl+'</span><span style="flex-shrink:0">'+seg.total.toLocaleString('ru')+' ₽</span>';
            }
            rows.appendChild(row);
          });
        }
        if (guestSurcharge>0) {
          var rowG=document.createElement('div');
          rowG.style.cssText='display:flex;justify-content:space-between;gap:8px;margin-bottom:4px;color:#6B7A99';
          rowG.innerHTML='<span>Наценка (3-й гость): 750 ₽ × '+nights+' '+nw(nights)+'</span><span style="flex-shrink:0">'+guestSurcharge.toLocaleString('ru')+' ₽</span>';
          rows.appendChild(rowG);
        }
        var total=pc.total+guestSurcharge;
        var totEl=document.createElement('div');
        totEl.style.cssText='display:flex;justify-content:space-between;font-weight:700;color:#2E384D;border-top:1.5px solid #E1E5F1;padding-top:8px;margin-top:4px;gap:8px';
        var avgLabel='Итого: '+nights+' '+nw(nights);
        if (nights>1) avgLabel+=', ср. '+Math.round(total/nights).toLocaleString('ru')+' ₽/ночь';
        totEl.innerHTML='<span>'+avgLabel+'</span><span style="flex-shrink:0">'+total.toLocaleString('ru')+' ₽</span>';
        rows.appendChild(totEl);
        el('bm-calc').style.display='block';
      }).catch(function(){});
    },

    _calRender: function() {
      var grid = el('bm-cal-grid');
      var title = el('bm-cal-title');
      if (!grid) return;
      var months=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
      if (title) title.textContent=months[calState.month]+' '+calState.year;
      var dateIn=el('bm-checkin').value;
      var nights=parseInt(el('bm-nights').value)||1;
      var selStart=dateIn?new Date(dateIn):null;
      var selEnd=selStart?new Date(selStart):null;
      if (selEnd) selEnd.setDate(selEnd.getDate()+nights);
      var first=new Date(calState.year,calState.month,1);
      var startDow=(first.getDay()+6)%7;
      var daysInMonth=new Date(calState.year,calState.month+1,0).getDate();
      var cells='';
      for (var i=0;i<startDow;i++) cells+='<div></div>';
      for (var d=1;d<=daysInMonth;d++) {
        var dt=new Date(calState.year,calState.month,d);
        var key=dt.getFullYear()+'-'+(dt.getMonth()+1)+'-'+dt.getDate();
        var isOcc=state.statuses[key]==='occupied';
        var isSel=selStart&&selEnd&&dt>=selStart&&dt<selEnd;
        var isToday=dt.toDateString()===new Date().toDateString();
        var bg=isOcc?'rgba(224,82,82,0.12)':isSel?'rgba(62,112,87,0.15)':'transparent';
        cells+='<div style="text-align:center;padding:4px 2px;border-radius:6px;font-size:12px;font-weight:'+(isToday?'700':'400')+';background:'+bg+';color:'+(isOcc?'#E05252':'#2E384D')+'">'+d+'</div>';
      }
      grid.innerHTML=cells;
    },

    _calPrev: function() { calState.month--; if(calState.month<0){calState.month=11;calState.year--;} this._calRender(); },
    _calNext: function() { calState.month++; if(calState.month>11){calState.month=0;calState.year++;} this._calRender(); },

    _submit: function() {
      var name=el('bm-name').value.trim();
      var phone=el('bm-phone').value.trim();
      var dateIn=el('bm-checkin').value;
      var dateOut=el('bm-checkout').value;
      var nights=parseInt(el('bm-nights').value)||2;
      var guests=parseInt(el('bm-guests').value)||2;
      var comment=el('bm-comment').value.trim();
      var checkConfirm=el('bm-check-confirm');
      var checkPd=el('bm-check-pd');
      var checkErr=el('bm-check-error');

      var ok = true;
      if (!name){el('bm-name').style.borderColor='#E05252';ok=false;}
      // Проверка телефона — ровно 11 цифр
      var digits = phone.replace(/\D/g,'');
      if (digits.length!==11){
        el('bm-phone').style.borderColor='#E05252';
        ok=false;
      }
      if (!dateIn){el('bm-checkin').style.borderColor='#E05252';ok=false;}
      if (nights < 2){el('bm-nights').style.borderColor='#E05252';ok=false;}
      // Чекбоксы
      if (!checkConfirm.checked || !checkPd.checked){
        if(checkErr) checkErr.style.display='block';
        ok=false;
      } else {
        if(checkErr) checkErr.style.display='none';
      }
      if (!ok) return;

      var guestSurcharge=guests>=3?750*nights:0;
      var self=this;

      var pricePromise=state.price&&dateIn&&dateOut
        ?fetch(cfg.appsUrl+'/pricing/calculate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_price:state.price,date_in:dateIn,date_out:dateOut,obj_id:state.objId})}).then(function(r){return r.json();}).catch(function(){return null;})
        :Promise.resolve(null);

      pricePromise.then(function(pc){
        var baseAmount=pc&&pc.ok?pc.total:state.price*nights;
        var amount=baseAmount+guestSurcharge;
        var nWord=nw(nights);
        var breakdown='';
        if (pc&&pc.ok&&pc.breakdown) {
          pc.breakdown.forEach(function(seg){
            if (seg.type==='promo') breakdown+='\n🏷 '+seg.label+': '+seg.price_per_night.toLocaleString('ru')+'₽ × '+seg.nights+' н. = '+seg.total.toLocaleString('ru')+'₽';
            else {
              var s=seg.price_per_night.toLocaleString('ru')+'₽ × '+seg.nights+' '+nWord;
              if (seg.discount_pct>0) s+=' −'+seg.discount_pct+'%';
              s+=' = '+seg.total.toLocaleString('ru')+'₽';
              breakdown+='\n'+s;
            }
          });
        }
        if (guestSurcharge>0) breakdown+='\n+750₽/ночь (3-й гость) = '+guestSurcharge.toLocaleString('ru')+'₽';

        fetch(cfg.appsUrl+'/bookings',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({obj_id:state.objId,name:name,phone:phone,date_in:dateIn,date_out:dateOut,guests:guests,amount:amount,comment:comment,status:'new'})
        }).then(function(r){return r.json();}).then(function(d){
          if (d.ok||d.id) {
            el('bm-form-screen').style.display='none';
            el('bm-success-screen').style.display='block';
            fetch(cfg.appsUrl+'/notify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'new_booking',name:name,phone:phone,date_in:dateIn,date_out:dateOut,nights:nights,amount:amount})}).catch(function(){});
            if (cfg.chatUrl) {
              var info='📋 Новая заявка от '+name+' ('+phone+')\n📅 '+dateIn+' — '+dateOut+', '+nights+' '+nWord+breakdown+'\n💰 Итого: '+amount.toLocaleString('ru')+' ₽';
              if (comment) info+='\n💬 '+comment;
              fetch(cfg.chatUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'notify',contact:name+' '+phone,dialog:info})}).catch(function(){});
            }
          }
        }).catch(function(){alert('Ошибка отправки. Попробуйте ещё раз.');});
      });
    },

    _openChat: function() {
      this.close();
      if (typeof cwToggle==='function' && !window.cwOpen) cwToggle();
      else if (typeof cwOpenChat==='function') cwOpenChat();
    }
  };
})();
