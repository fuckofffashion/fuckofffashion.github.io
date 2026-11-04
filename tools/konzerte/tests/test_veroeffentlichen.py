"""Test für tools/veroeffentlichen.sh (Allowlist-Kopie in den Pages-Klon).

Alle Tests laufen gegen eine Attrappe des Repos in einem Temp-Ordner, nie gegen das echte Repo.
"""
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ECHTES_SKRIPT = Path(__file__).resolve().parents[3] / "tools" / "veroeffentlichen.sh"
BASH = shutil.which("bash")

ALLOWLIST = {
    "index.html", "konzerte.html", "404.html", "impressum.html", "datenschutz.html",
    "css/a.css", "css/sub/b.css", "js/a.js", "js/konzerte/app.js", "assets/bild.webp",
    "data/konzerte.json", "data/karte.json", "data/orte-tabelle.json",
}
AUSGESCHLOSSEN = {
    "docs/plan.md", "tools/x.py", "tests/t.mjs", "kit/k.txt", "styleguide.html", "README.md",
    "data/orte.json", "data/quellen-status.json", ".gitignore", "redesign/r.html",
}


def schreibe(wurzel: Path, rel: str, inhalt="x"):
    p = wurzel / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(inhalt, encoding="utf-8")


def dateien(ordner: Path):
    return {p.relative_to(ordner).as_posix() for p in ordner.rglob("*")
            if p.is_file() and ".git" not in p.relative_to(ordner).parts}


@unittest.skipUnless(BASH, "bash nicht gefunden")
class VeroeffentlichenTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.tmp = Path(tmp.name).resolve()
        self.wurzel = self.tmp / "repo"
        for rel in ALLOWLIST | AUSGESCHLOSSEN:
            schreibe(self.wurzel, rel, rel)
        (self.wurzel / "tools").mkdir(exist_ok=True)
        shutil.copy(ECHTES_SKRIPT, self.wurzel / "tools" / "veroeffentlichen.sh")
        self.ziel = self.tmp / "pages"
        self.ziel.mkdir()

    def lauf(self, *args, cwd=None):
        return subprocess.run(
            [BASH, (self.wurzel / "tools" / "veroeffentlichen.sh").as_posix(),
             *(Path(a).as_posix() for a in args)],
            cwd=cwd or self.tmp, capture_output=True, text=True)

    def wurzel_unveraendert(self):
        self.assertEqual(dateien(self.wurzel), ALLOWLIST | AUSGESCHLOSSEN | {"tools/veroeffentlichen.sh"})

    def test_kopiert_genau_die_allowlist_mit_struktur(self):
        (self.ziel / ".git").mkdir()
        r = self.lauf(self.ziel)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(dateien(self.ziel), ALLOWLIST)
        self.assertEqual((self.ziel / "css/sub/b.css").read_text(), "css/sub/b.css")

    def test_aufruf_aus_anderem_arbeitsverzeichnis(self):
        (self.ziel / ".git").mkdir()
        r = self.lauf(self.ziel, cwd=self.ziel)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(dateien(self.ziel), ALLOWLIST)

    def test_git_bleibt_und_altes_verschwindet(self):
        schreibe(self.ziel, ".git/HEAD", "ref: refs/heads/main\n")
        schreibe(self.ziel, "alt.html")
        schreibe(self.ziel, "altdir/x.txt")
        schreibe(self.ziel, "data/orte.json")
        r = self.lauf(self.ziel)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual((self.ziel / ".git/HEAD").read_text(), "ref: refs/heads/main\n")
        self.assertEqual(dateien(self.ziel), ALLOWLIST)

    def test_domains_im_ziel_bleibt_ohne_quelle_unveraendert(self):
        (self.ziel / ".git").mkdir()
        (self.ziel / ".domains").write_bytes(b"fuckofffashion.example\r\n\x00ende")
        r = self.lauf(self.ziel)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual((self.ziel / ".domains").read_bytes(), b"fuckofffashion.example\r\n\x00ende")

    def test_domains_aus_quelle_wird_kopiert(self):
        schreibe(self.wurzel, ".domains", "neu.example\n")
        (self.ziel / ".git").mkdir()
        (self.ziel / ".domains").write_text("alt.example\n")
        r = self.lauf(self.ziel)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual((self.ziel / ".domains").read_text(), "neu.example\n")

    def test_ohne_argument_bricht_ab(self):
        r = subprocess.run([BASH, (self.wurzel / "tools" / "veroeffentlichen.sh").as_posix()],
                           capture_output=True, text=True)
        self.assertNotEqual(r.returncode, 0)
        self.assertTrue(r.stderr.strip())
        self.wurzel_unveraendert()

    def test_repo_wurzel_als_ziel_bricht_ab(self):
        (self.wurzel / ".git").mkdir()  # selbst mit .git darf nichts passieren
        r = self.lauf(self.wurzel)
        self.assertNotEqual(r.returncode, 0)
        self.wurzel_unveraendert()

    def test_ziel_im_repo_bricht_ab(self):
        sub = self.wurzel / "css"
        r = self.lauf(sub)
        self.assertNotEqual(r.returncode, 0)
        self.wurzel_unveraendert()

    def test_ziel_ueber_dem_repo_bricht_ab(self):
        (self.tmp / ".git").mkdir()
        r = self.lauf(self.tmp)
        self.assertNotEqual(r.returncode, 0)
        self.wurzel_unveraendert()
        self.assertTrue(self.ziel.exists())

    def test_nichtleeres_ziel_ohne_git_bricht_ab(self):
        schreibe(self.ziel, "wichtig.txt", "nicht loeschen")
        r = self.lauf(self.ziel)
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual((self.ziel / "wichtig.txt").read_text(), "nicht loeschen")

    def test_leeres_ziel_ohne_git_ist_erlaubt(self):
        r = self.lauf(self.ziel)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(dateien(self.ziel), ALLOWLIST)

    def test_nicht_existierendes_ziel_bricht_ab(self):
        r = self.lauf(self.ziel / "gibts-nicht")
        self.assertNotEqual(r.returncode, 0)

    def test_fehlende_quelle_bricht_ab_ohne_das_ziel_zu_leeren(self):
        (self.wurzel / "data/karte.json").unlink()
        schreibe(self.ziel, ".git/HEAD")
        schreibe(self.ziel, "alt.html", "alt")
        r = self.lauf(self.ziel)
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual((self.ziel / "alt.html").read_text(), "alt")


if __name__ == "__main__":
    unittest.main()
