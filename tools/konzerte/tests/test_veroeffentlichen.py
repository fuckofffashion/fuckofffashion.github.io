"""Test für tools/veroeffentlichen.sh (Allowlist-Kopie in den Zielordner für GitHub Pages).

Alle Tests laufen gegen eine Attrappe des Repos in einem Temp-Ordner, nie gegen das echte Repo.
"""
import os
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


BASIS_404 = '<head>\n  <base href="/">\n</head>\n<a href="index.html#wand">x</a>\n'


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
        schreibe(self.wurzel, "404.html", BASIS_404)
        (self.wurzel / "tools").mkdir(exist_ok=True)
        shutil.copy(ECHTES_SKRIPT, self.wurzel / "tools" / "veroeffentlichen.sh")
        self.ziel = self.tmp / "pages"
        self.ziel.mkdir()

    def lauf(self, *args, cwd=None, env_zusatz=None):
        env = {k: v for k, v in os.environ.items() if k != "GITHUB_REPOSITORY"}
        env.update(env_zusatz or {})
        return subprocess.run(
            [BASH, (self.wurzel / "tools" / "veroeffentlichen.sh").as_posix(),
             *(Path(a).as_posix() for a in args)],
            cwd=cwd or self.tmp, capture_output=True, text=True, encoding="utf-8", errors="replace", env=env)

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

    def test_ohne_cname_wird_keine_cname_angelegt(self):
        r = self.lauf(self.ziel)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertFalse((self.ziel / "CNAME").exists())

    def test_cname_aus_quelle_wird_kopiert(self):
        schreibe(self.wurzel, "CNAME", "neu.example\n")
        (self.ziel / ".git").mkdir()
        schreibe(self.ziel, "CNAME", "alt.example\n")
        r = self.lauf(self.ziel)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual((self.ziel / "CNAME").read_text(), "neu.example\n")

    def basis_der_404(self):
        return (self.ziel / "404.html").read_text(encoding="utf-8")

    def test_404_basis_lokal_ohne_cname_und_repo_bleibt_wurzel(self):
        r = self.lauf(self.ziel)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.basis_der_404(), BASIS_404)

    def test_404_basis_projektseite_aus_github_repository(self):
        r = self.lauf(self.ziel, env_zusatz={"GITHUB_REPOSITORY": "mark/fuckofffashion"})
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.basis_der_404(), BASIS_404.replace('href="/"', 'href="/fuckofffashion/"'))
        # Quelle bleibt unverändert
        self.assertEqual((self.wurzel / "404.html").read_text(encoding="utf-8"), BASIS_404)

    def test_404_basis_mit_cname_ist_wurzel(self):
        schreibe(self.wurzel, "CNAME", "example.org")
        r = self.lauf(self.ziel, env_zusatz={"GITHUB_REPOSITORY": "mark/fuckofffashion"})
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.basis_der_404(), BASIS_404)

    def test_404_basis_nutzerseite_github_io_ist_wurzel(self):
        r = self.lauf(self.ziel, env_zusatz={"GITHUB_REPOSITORY": "mark/mark.github.io"})
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.basis_der_404(), BASIS_404)

    def test_404_ohne_base_in_quelle_bricht_ab_ohne_das_ziel_zu_leeren(self):
        schreibe(self.wurzel, "404.html", "<head></head>")
        schreibe(self.ziel, "alt.html", "bleibt")
        r = self.lauf(self.ziel)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("base", r.stderr)
        self.assertEqual((self.ziel / "alt.html").read_text(), "bleibt")

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

    def test_platzhalter_bitte_ausfuellen_bricht_ab_ohne_das_ziel_zu_leeren(self):
        schreibe(self.wurzel, "impressum.html", '<p><span class="todo">[bitte ausfüllen]</span> Name</p>')
        schreibe(self.ziel, ".git/HEAD")
        schreibe(self.ziel, "alt.html", "bleibt")
        r = self.lauf(self.ziel)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("[bitte ausfüllen]", r.stderr)
        self.assertIn("impressum.html", r.stderr)
        self.assertNotIn("datenschutz.html", r.stderr)
        self.assertEqual((self.ziel / "alt.html").read_text(), "bleibt")
        self.assertNotIn("impressum.html", dateien(self.ziel))

    def test_fehlende_quelle_bricht_ab_ohne_das_ziel_zu_leeren(self):
        (self.wurzel / "data/karte.json").unlink()
        schreibe(self.ziel, ".git/HEAD")
        schreibe(self.ziel, "alt.html", "alt")
        r = self.lauf(self.ziel)
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual((self.ziel / "alt.html").read_text(), "alt")


if __name__ == "__main__":
    unittest.main()
