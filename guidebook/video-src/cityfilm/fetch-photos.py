"""Picks and downloads freely licensed photos from Wikimedia Commons for the city films.

For every place below it searches Commons, keeps the first landscape file that is big enough and
licensed CC0 / public domain / CC BY / CC BY-SA, downloads a 1920 px rendition (slowly, honouring
Retry-After) and records author and licence in credits-<city>.json.

usage: python3 fetch-photos.py [city ...]
"""
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
UA = 'HamkorGuidebook/1.0 (internal onboarding guidebook; contact tanlov307 via github)'
API = 'https://commons.wikimedia.org/w/api.php'

# city -> [(search terms, {ru, en, uz} caption)]
PLACES = {
    'tashkent': [
        ('Hazrati Imam complex Tashkent', {'ru': 'Комплекс Хазрати Имам', 'en': 'Hazrati Imam complex', 'uz': 'Hazrati Imom majmuasi'}),
        ('Kukeldash madrasah Tashkent', {'ru': 'Медресе Кукельдаш', 'en': 'Kukeldash madrasah', 'uz': 'Koʻkaldosh madrasasi'}),
        ('Chorsu bazaar Tashkent', {'ru': 'Базар Чорсу', 'en': 'Chorsu bazaar', 'uz': 'Chorsu bozori'}),
        ('Minor mosque Tashkent', {'ru': 'Мечеть Минор', 'en': 'Minor mosque', 'uz': 'Minor masjidi'}),
        ('Tashkent metro station Kosmonavtlar', {'ru': 'Метро «Космонавтов»', 'en': 'Kosmonavtlar metro station', 'uz': '«Kosmonavtlar» metro bekati'}),
        ('Tashkent city skyline', {'ru': 'Ташкент сегодня', 'en': 'Tashkent today', 'uz': 'Bugungi Toshkent'}),
    ],
    'andijan': [
        ('Jami mosque Andijan', {'ru': 'Комплекс Джами', 'en': 'Jami complex', 'uz': 'Jome majmuasi'}),
        ('Andijan mosque', {'ru': 'Мечеть Девонабой', 'en': 'Devonaboy mosque', 'uz': 'Devonaboy masjidi'}),
        ('Babur Andijan', {'ru': 'Память о Бабуре', 'en': 'In memory of Babur', 'uz': 'Bobur xotirasi'}),
        ('Andijan city', {'ru': 'Улицы Андижана', 'en': 'Andijan streets', 'uz': 'Andijon koʻchalari'}),
        ('Fergana valley landscape', {'ru': 'Ферганская долина', 'en': 'Fergana valley', 'uz': 'Fargʻona vodiysi'}),
    ],
    'samarkand': [
        ('Registan Samarkand', {'ru': 'Площадь Регистан', 'en': 'Registan square', 'uz': 'Registon maydoni'}),
        ('Shah-i-Zinda Samarkand', {'ru': 'Шахи-Зинда', 'en': 'Shah-i-Zinda', 'uz': 'Shohi Zinda'}),
        ('Gur-e-Amir Samarkand', {'ru': 'Гур-Эмир', 'en': 'Gur-e-Amir', 'uz': 'Goʻri Amir'}),
        ('Bibi-Khanym mosque', {'ru': 'Мечеть Биби-Ханум', 'en': 'Bibi-Khanym mosque', 'uz': 'Bibixonim masjidi'}),
        ('Ulugh Beg observatory', {'ru': 'Обсерватория Улугбека', 'en': 'Ulugh Beg observatory', 'uz': 'Ulugʻbek rasadxonasi'}),
    ],
    'bukhara': [
        ('Kalyan minaret Bukhara', {'ru': 'Ансамбль Пои-Калян', 'en': 'Po-i-Kalyan ensemble', 'uz': 'Poi Kalon ansambli'}),
        ('Ark fortress Bukhara', {'ru': 'Крепость Арк', 'en': 'Ark fortress', 'uz': 'Ark qalʼasi'}),
        ('Lyab-i Hauz Bukhara', {'ru': 'Ляби-Хауз', 'en': 'Lyabi-Hauz', 'uz': 'Labi hovuz'}),
        ('Chor Minor Bukhara', {'ru': 'Чор-Минор', 'en': 'Chor-Minor', 'uz': 'Chor Minor'}),
        ('Samanid mausoleum Bukhara', {'ru': 'Мавзолей Саманидов', 'en': 'Samanid mausoleum', 'uz': 'Somoniylar maqbarasi'}),
    ],
    'khiva': [
        ('Kalta Minor Khiva', {'ru': 'Минарет Кальта-Минор', 'en': 'Kalta Minor minaret', 'uz': 'Kalta Minor minorasi'}),
        ('Itchan Kala walls Khiva', {'ru': 'Стены Ичан-Калы', 'en': 'Itchan Kala walls', 'uz': 'Ichan qalʼa devorlari'}),
        ('Islam Khodja minaret Khiva', {'ru': 'Минарет Ислам-Ходжа', 'en': 'Islam Khodja minaret', 'uz': 'Islomxoʻja minorasi'}),
        ('Juma mosque Khiva', {'ru': 'Мечеть Джума', 'en': 'Juma mosque', 'uz': 'Juma masjidi'}),
        ('Kunya Ark Khiva', {'ru': 'Куня-Арк', 'en': 'Kunya-Ark', 'uz': 'Koʻhna Ark'}),
    ],
    'mountains': [
        ('Charvak reservoir', {'ru': 'Чарвакское водохранилище', 'en': 'Charvak reservoir', 'uz': 'Chorvoq suv ombori'}),
        ('Chimgan mountains', {'ru': 'Горы Чимгана', 'en': 'Chimgan mountains', 'uz': 'Chimyon togʻlari'}),
        ('Ugam-Chatkal national park', {'ru': 'Угам-Чаткальский парк', 'en': 'Ugam-Chatkal park', 'uz': 'Ugom-Chotqol bogʻi'}),
        ('Beldersay', {'ru': 'Бельдерсай', 'en': 'Beldersay', 'uz': 'Beldersoy'}),
        ('Tian Shan Uzbekistan mountains', {'ru': 'Западный Тянь-Шань', 'en': 'Western Tian Shan', 'uz': 'Gʻarbiy Tyan-Shan'}),
    ],
}
OK = re.compile(r'^(cc0|public domain|pd|cc by(-sa)? [\d.]+( [a-z]+)?)$', re.I)


def get(url, binary=False, tries=8):
    wait = 15
    for _ in range(tries):
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
                return data if binary else json.loads(data)
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            ra = int(e.headers.get('Retry-After') or wait)
            time.sleep(min(max(ra, wait), 180))
            wait = min(wait * 2, 180)
    raise RuntimeError(f'gave up: {url}')


def strip(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s or '')).strip()


def pick(terms, used):
    q = urllib.parse.urlencode({'action': 'query', 'list': 'search', 'srsearch': f'{terms} filetype:bitmap', 'srnamespace': 6, 'srlimit': 25, 'format': 'json'})
    titles = [r['title'] for r in get(f'{API}?{q}')['query']['search']]
    for i in range(0, len(titles), 10):
        q = urllib.parse.urlencode({'action': 'query', 'titles': '|'.join(titles[i:i + 10]), 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata', 'iiurlwidth': 1920, 'format': 'json'})
        pages = get(f'{API}?{q}')['query']['pages'].values()
        by = {p['title']: p for p in pages if 'imageinfo' in p}
        for t in titles[i:i + 10]:
            p = by.get(t)
            if not p or t in used:
                continue
            ii = p['imageinfo'][0]
            m = ii.get('extmetadata', {})
            lic = strip(m.get('LicenseShortName', {}).get('value'))
            if not OK.match(lic) or ii['width'] < 2000 or ii['width'] < ii['height'] * 1.25:
                continue
            return t, ii, lic, strip(m.get('Artist', {}).get('value')) or 'Unknown', m.get('LicenseUrl', {}).get('value', '')
    return None


def main():
    cities = sys.argv[1:] or list(PLACES)
    (HERE / 'photos').mkdir(exist_ok=True)
    for city in cities:
        out, used = [], set()
        for terms, place in PLACES[city]:
            if len(out) == 5:
                break
            found = pick(terms, used)
            if not found:
                print('  none:', terms, flush=True)
                continue
            title, ii, lic, author, lurl = found
            used.add(title)
            name = f'{city}-{len(out) + 1}.jpg'
            (HERE / 'photos' / name).write_bytes(get(ii['thumburl'], binary=True))
            out.append({'file': name, 'city': city, 'place': place, 'author': author[:80], 'license': lic, 'licenseUrl': lurl, 'source': ii['descriptionurl']})
            print(' ', name, '|', place['en'], '|', lic, '|', author[:40], flush=True)
            time.sleep(6)
        (HERE / f'credits-{city}.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
        print('done', city, len(out), flush=True)


if __name__ == '__main__':
    main()
