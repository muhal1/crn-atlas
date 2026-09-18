# -*- coding: utf-8 -*-
"""İTÜ lisansüstü akademik takvimini ortak, statik JSON verisine dönüştürür."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

KAYNAK = (
    "https://www.takvim.sis.itu.edu.tr/AkademikTakvim/TR/akademik-takvim/"
    "AkademikTakvimTablo.php?akademikyil=854&takvimadi=19&katagori=&baslangic=&bitis="
)
HEDEF = Path(__file__).resolve().parent / "veri" / "akademik_takvim.json"


def temizle(metin: str) -> str:
    return re.sub(r"\s+", " ", metin).strip()


class TakvimTablolari(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tablolar: list[list[list[str]]] = []
        self.basliklar: list[str] = []
        self.son_baslik = ""
        self.baslik_parcalari: list[str] | None = None
        self.tablo: list[list[str]] | None = None
        self.satir: list[str] | None = None
        self.hucre: list[str] | None = None

    def handle_starttag(self, tag: str, attrs):
        if tag == "h4":
            self.baslik_parcalari = []
        elif tag == "table":
            self.tablo = []
            self.basliklar.append(self.son_baslik)
        elif tag == "tr" and self.tablo is not None:
            self.satir = []
        elif tag in {"td", "th"} and self.satir is not None:
            self.hucre = []

    def handle_data(self, data: str):
        if self.baslik_parcalari is not None:
            self.baslik_parcalari.append(data)
        if self.hucre is not None:
            self.hucre.append(data)

    def handle_endtag(self, tag: str):
        if tag == "h4" and self.baslik_parcalari is not None:
            self.son_baslik = temizle("".join(self.baslik_parcalari))
            self.baslik_parcalari = None
        elif tag in {"td", "th"} and self.hucre is not None and self.satir is not None:
            self.satir.append(temizle("".join(self.hucre)))
            self.hucre = None
        elif tag == "tr" and self.satir is not None and self.tablo is not None:
            if self.satir:
                self.tablo.append(self.satir)
            self.satir = None
        elif tag == "table" and self.tablo is not None:
            self.tablolar.append(self.tablo)
            self.tablo = None


def ayristir(html: str) -> dict:
    ayristirici = TakvimTablolari()
    ayristirici.feed(html)
    for baslik, tablo in zip(ayristirici.basliklar, ayristirici.tablolar):
        if not tablo or tablo[0][:2] != ["Güz Dönemi", "Tarih"]:
            continue
        yil = re.search(r"20\d{2}-20\d{2}", baslik)
        if not yil or "Lisansüstü" not in baslik:
            continue
        donemler = []
        for satir in tablo:
            if len(satir) < 2:
                continue
            if satir[0] in {"Güz Dönemi", "Bahar Dönemi"}:
                donemler.append({"name": satir[0], "events": []})
            elif donemler and satir[0] and satir[1]:
                donemler[-1]["events"].append({"title": satir[0], "date": satir[1]})
        if len(donemler) != 2 or any(len(d["events"]) < 10 for d in donemler):
            raise ValueError("Lisansüstü takvim tablosu eksik veya biçimi değişmiş.")
        return {
            "academic_year": yil.group(),
            "source_url": KAYNAK,
            "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "periods": donemler,
        }
    raise ValueError("Resmî sayfada lisansüstü akademik takvim tablosu bulunamadı.")


def guncelle() -> dict:
    istek = Request(KAYNAK, headers={"User-Agent": "CRNAtlas/1.0 (+academic-calendar)"})
    with urlopen(istek, timeout=25) as yanit:
        html = yanit.read().decode("utf-8-sig")
    veri = ayristir(html)
    HEDEF.write_text(json.dumps(veri, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return veri


if __name__ == "__main__":
    veri = guncelle()
    print(f"{veri['academic_year']}: " + ", ".join(
        f"{donem['name']} {len(donem['events'])} etkinlik" for donem in veri["periods"]
    ))
