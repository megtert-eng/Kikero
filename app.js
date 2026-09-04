const CLIENT_ID = '1002393104774-nj44opdrl9l7qqcnrd4tq551ppqi0ufr.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly';

let tokenClient;
let accessToken = null;
let bejelentkezettEmail = null;

function initSelectek() {
  const oraSelect = document.getElementById('ora');
  for (let i = 7; i <= 18; i++) {
    const opt = document.createElement('option');
    opt.value = String(i).padStart(2, '0');
    opt.textContent = String(i).padStart(2, '0');
    oraSelect.appendChild(opt);
  }

  const percSelect = document.getElementById('perc');
  for (let i = 0; i < 60; i += 5) {
    const opt = document.createElement('option');
    opt.value = String(i).padStart(2, '0');
    opt.textContent = String(i).padStart(2, '0');
    percSelect.appendChild(opt);
  }
}

function initDatum() {
  const ma = new Date();
  const ev = ma.getFullYear();
  const ho = String(ma.getMonth() + 1).padStart(2, '0');
  const nap = String(ma.getDate()).padStart(2, '0');
  document.getElementById('datum').value = `${ev}-${ho}-${nap}`;
}

function emailSzoveg(datum, ora, perc) {
  const [ev, ho, nap] = datum.split('-');
  return `Tisztelt Iskola!\n\nKérem Márk elbocsátását ${ev}.${ho}.${nap} ${ora}:${perc}-kor.\n\nÜdvözlettel,\nMegtért Gábor`;
}

function emailBase64(szoveg) {
  const emailSorok = [
    'To: mza.ppm@gmail.com',
    ...(bejelentkezettEmail ? ['Cc: ' + bejelentkezettEmail] : []),
    'Subject: =?UTF-8?B?' + btoa(unescape(encodeURIComponent('Megtért Márk 3.b'))) + '?=',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(szoveg)))
  ].join('\r\n');

  return btoa(unescape(encodeURIComponent(emailSorok)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function kuldesEmail() {
  const datum = document.getElementById('datum').value;
  const ora = document.getElementById('ora').value;
  const perc = document.getElementById('perc').value;

  if (!datum) {
    uzenetMutat('Kérlek válassz dátumot!', 'hiba');
    return;
  }

  const gomb = document.getElementById('kuldesGomb');
  gomb.disabled = true;
  gomb.textContent = 'Küldés...';

  try {
    const szoveg = emailSzoveg(datum, ora, perc);
    const raw = emailBase64(szoveg);

    const valasz = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw })
    });

    if (!valasz.ok) {
      const hiba = await valasz.json();
      throw new Error(hiba.error?.message || 'Ismeretlen hiba');
    }

    uzenetMutat('Email elküldve!', 'siker');
  } catch (e) {
    uzenetMutat('Hiba: ' + e.message, 'hiba');
  } finally {
    gomb.disabled = false;
    gomb.textContent = 'Küldés';
  }
}

function uzenetMutat(szoveg, tipus) {
  const el = document.getElementById('uzenet');
  el.style.display = 'block';
  el.className = tipus;
  el.textContent = szoveg;
  setTimeout(() => { el.className = ''; el.style.display = 'none'; }, 5000);
}

function initGIS() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (resp) => {
      if (resp.error) {
        uzenetMutat('Bejelentkezési hiba: ' + resp.error, 'hiba');
        return;
      }
      accessToken = resp.access_token;
      fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      })
        .then(r => r.json())
        .then(data => {
          bejelentkezettEmail = data.emailAddress;
          document.getElementById('kuldesGomb').disabled = false;
          document.getElementById('bejelentkezve').textContent = 'Bejelentkezve ✓';
          kuldesEmail();
        });
    }
  });
}

function kuldesGombKattint() {
  if (!accessToken) {
    tokenClient.requestAccessToken();
  } else {
    kuldesEmail();
  }
}

window.onload = () => {
  initSelectek();
  initDatum();

  const gisVarakozas = setInterval(() => {
    if (typeof google !== 'undefined' && google.accounts) {
      clearInterval(gisVarakozas);
      initGIS();
      document.getElementById('kuldesGomb').disabled = false;
      document.getElementById('kuldesGomb').addEventListener('click', kuldesGombKattint);
    }
  }, 100);
};
