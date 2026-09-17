"""Yeni programlarin ortak ders planini ve guncel CRN verisini uretir.

Bir program sorgusu basarisiz olursa mevcut basarili veri dosyalarina dokunmaz.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import obs_client as obs


KOK = Path(__file__).resolve().parent
PROGRAMLAR = {
    "uzay": {
        "bolum": "Uzay Mühendisliği Yüksek Lisans",
        "planId": 2628,
        "seviye": "LU",
        "anaBransKodlari": ["UZM"],
        "ekBransKodlari": ["UUM", "MAK", "MKM", "KOM", "ELE", "BLG", "MAT", "RBT"],
    },
    "cevre": {
        "bolum": "Çevre Bilimleri Mühendisliği ve Yönetimi Yüksek Lisans",
        "planId": 2565,
        "seviye": "LU",
        "anaBransKodlari": ["CBM"],
        "ekBransKodlari": ["ENB", "KIM", "MET", "JEO", "JFM", "END", "BVA", "BLG"],
    },
}


def yaz(yol: Path, veri: dict) -> None:
    yol.parent.mkdir(parents=True, exist_ok=True)
    yol.write_text(json.dumps(veri, ensure_ascii=False, indent=2), encoding="utf-8")


def guncelle(program: str, sadece_dersler: bool) -> None:
    ayarlar = PROGRAMLAR[program]
    klasor = KOK / "veri" / "programlar" / program
    plan_yolu = klasor / "plan.json"
    eski_plan = json.loads(plan_yolu.read_text(encoding="utf-8")) if plan_yolu.exists() else None
    if sadece_dersler and plan_yolu.exists():
        plan = eski_plan
    else:
        plan = obs.ders_plani_cek(
            ayarlar["planId"], log=print, eksik_gruplari_tolere_et=True
        )
        if eski_plan and eski_plan.get("planId") == plan.get("planId"):
            eksik = sum(bool(g.get("eksikKaynak")) for g in plan["gereksinimler"])
            eski_eksik = sum(bool(g.get("eksikKaynak")) for g in eski_plan["gereksinimler"])
            if eksik > eski_eksik:
                print(f"  ! Yeni planda {eksik} eksik grup var; önceki planda {eski_eksik}. Önceki plan korunuyor.")
                plan = eski_plan
    for gereksinim in plan["gereksinimler"]:
        if gereksinim.get("tur") == "LUS":
            gereksinim["serbest"] = True
    dersler = obs.donem_derslerini_topla(
        plan, ayarlar["seviye"], ayarlar["ekBransKodlari"], log=print,
        serbest_brans_kodlari=ayarlar["anaBransKodlari"] + ayarlar["ekBransKodlari"],
    )
    # Tum sorgular basarili olduktan sonra dosyalari degistir.
    yaz(klasor / "ayarlar.json", ayarlar)
    yaz(plan_yolu, plan)
    yaz(klasor / "dersler.json", dersler)
    print(f"{program}: {len(plan['gereksinimler'])} gereksinim, {len(dersler['dersler'])} CRN")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("program", choices=[*PROGRAMLAR, "hepsi"])
    parser.add_argument("--sadece-dersler", action="store_true")
    args = parser.parse_args()
    for kod in PROGRAMLAR if args.program == "hepsi" else [args.program]:
        guncelle(kod, args.sadece_dersler)
