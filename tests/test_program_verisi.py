import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import program_verisi


def plan(eksik):
    return {
        "planId": 2565,
        "gereksinimler": [
            {"grupId": sira, "tur": "Z", "serbest": False,
             "eksikKaynak": sira < eksik, "dersler": []}
            for sira in range(3)
        ],
    }


class ProgramVerisiTesti(unittest.TestCase):
    def setUp(self):
        self.gecici = tempfile.TemporaryDirectory()
        self.addCleanup(self.gecici.cleanup)
        self.kok = Path(self.gecici.name)
        self.plan_yolu = self.kok / "veri/programlar/cevre/plan.json"
        self.plan_yolu.parent.mkdir(parents=True)
        self.plan_yolu.write_text(json.dumps(plan(1)), encoding="utf-8")

    def yenile(self, yeni_plan):
        with patch.object(program_verisi, "KOK", self.kok), \
             patch.object(program_verisi.obs, "ders_plani_cek", return_value=yeni_plan), \
             patch.object(program_verisi.obs, "donem_derslerini_topla", return_value={"dersler": []}):
            program_verisi.guncelle("cevre", False)
        return json.loads(self.plan_yolu.read_text(encoding="utf-8"))

    def test_daha_eksik_plan_eskisini_ezmez(self):
        self.assertEqual(1, sum(g["eksikKaynak"] for g in self.yenile(plan(2))["gereksinimler"]))

    def test_duzelen_plan_kaydedilir(self):
        self.assertEqual(0, sum(g["eksikKaynak"] for g in self.yenile(plan(0))["gereksinimler"]))


if __name__ == "__main__":
    unittest.main()
