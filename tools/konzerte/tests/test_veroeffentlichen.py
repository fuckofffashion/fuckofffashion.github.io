"""Test für tools/veroeffentlichen.sh (Allowlist-Kopie in den Pages-Klon)."""
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[3]
SKRIPT = WURZEL / "tools" / "veroeffentlichen.sh"
BASH = shutil.which("bash")

ERWARTET = {
    "index.html", "konzerte.html", "404.html", "impressum.html", "datenschutz.html",
    "data/konzerte.json", "data/karte.json", "data/orte-tabelle.json",
}
VERBOTEN_PRAEFIXE = ("docs/", "tools/", "tests/", "kit/")
VERBOTEN_DATEIEN = {"styleguide.html", "README.md", "data/orte.json", "data/quellen-status.json"}


def dateien(ordner: Path, ohne_git=True):
    return {p.relative_to(ordner).as_posix() for p in ordner.rglob("*")
            if p.is_file() and not (ohne_git and ".git" in p.relative_to(ordner).parts)}


def lauf(*args):
    return subprocess.run([BASH, SKRIPT.as_posix(), *(Path(a).as_posix() for a in args)], cwd=tempfile.gettempdir(),
                          capture_output=True, text=True)


@unittest.skipUnless(BASH, "bash nicht gefunden")
class VeroeffentlichenTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.ziel = Path(self._tmp.name) / "pages"
        self.ziel.mkdir()

    def test_kopiert_genau_die_allowlist(self):
        (self.ziel / ".git").mkdir()
        r = lauf(self.ziel)
        self.assertEqual(r.returncode, 0, r.stderr)
        d = dateien(self.ziel)
        self.assertTrue(ERWARTET <= d, ERWARTET - d)
        for datei in d:
            ok = (datei in ERWARTET or datei == ".domains"
                  or datei.startswith(("css/", "js/", "assets/")))
            self.assertTrue(ok, f"unerwartet: {datei}")
            self.assertFalse(datei.startswith(VERBOTEN_PRAEFIXE), datei)
            self.assertNotIn(datei, VERBOTEN_DATEIEN)
        self.assertTrue(any(f.startswith("css/") for f in d))
        self.assertTrue(any(f.startswith("js/") for f in d))
        self.assertTrue(any(f.startswith("assets/") for f in d))

    def test_git_bleibt_und_altes_verschwindet(self):
        (self.ziel / ".git").mkdir()
        (self.ziel / ".git" / "HEAD").write_text("ref: refs/heads/main\n")
        (self.ziel / "alt.html").write_text("alt")
        (self.ziel / "altdir").mkdir()
        (self.ziel / "altdir" / "x.txt").write_text("x")
        r = lauf(self.ziel)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual((self.ziel / ".git" / "HEAD").read_text(), "ref: refs/heads/main\n")
        self.assertFalse((self.ziel / "alt.html").exists())
        self.assertFalse((self.ziel / "altdir").exists())

    def test_domains_bleibt_im_ziel_erhalten_oder_wird_ersetzt(self):
        (self.ziel / ".git").mkdir()
        (self.ziel / ".domains").write_text("alt.example\n")
        r = lauf(self.ziel)
        self.assertEqual(r.returncode, 0, r.stderr)
        quelle = WURZEL / ".domains"
        if quelle.exists():
            self.assertEqual((self.ziel / ".domains").read_text(), quelle.read_text())

    def test_ohne_argument_bricht_ab(self):
        r = lauf()
        self.assertNotEqual(r.returncode, 0)
        self.assertTrue(r.stderr.strip())

    def test_repo_wurzel_als_ziel_bricht_ab(self):
        r = lauf(WURZEL)
        self.assertNotEqual(r.returncode, 0)
        self.assertTrue((WURZEL / "index.html").exists())
        self.assertTrue((WURZEL / "tools").exists())

    def test_nichtleeres_ziel_ohne_git_bricht_ab(self):
        (self.ziel / "wichtig.txt").write_text("nicht löschen")
        r = lauf(self.ziel)
        self.assertNotEqual(r.returncode, 0)
        self.assertTrue((self.ziel / "wichtig.txt").exists())

    def test_leeres_ziel_ohne_git_ist_erlaubt(self):
        r = lauf(self.ziel)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("index.html", dateien(self.ziel))

    def test_nicht_existierendes_ziel_bricht_ab(self):
        r = lauf(self.ziel / "gibts-nicht")
        self.assertNotEqual(r.returncode, 0)


if __name__ == "__main__":
    unittest.main()
