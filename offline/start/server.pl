#!/usr/bin/perl
# Statable ohne Netz - kleiner Server für Mac und Linux (nur Perl-Bordmittel).
# Liefert den Ordner "statable" an den Browser dieses Rechners (nur 127.0.0.1, von außen nicht erreichbar) und öffnet ihn.
# Fenster schließen oder Ctrl+C beendet Statable.
use strict; use warnings;
use IO::Socket::INET; use File::Basename qw(dirname); use File::Spec; use Cwd qw(abs_path);
$SIG{PIPE} = 'IGNORE';
$SIG{CHLD} = 'IGNORE';   # beendete Kind-Prozesse räumt das System weg
$| = 1;

my $wurzel = abs_path(File::Spec->catdir(dirname(abs_path($0)), '..', 'statable'));
die "Ordner statable fehlt neben dem Ordner start.\n" unless -f "$wurzel/index.html";
my %typ = (html => 'text/html; charset=utf-8', js => 'text/javascript; charset=utf-8', mjs => 'text/javascript; charset=utf-8', css => 'text/css; charset=utf-8',
  json => 'application/json', wasm => 'application/wasm', svg => 'image/svg+xml', png => 'image/png', jpg => 'image/jpeg', ico => 'image/x-icon', webmanifest => 'application/manifest+json',
  csv => 'text/csv; charset=utf-8', txt => 'text/plain; charset=utf-8', md => 'text/plain; charset=utf-8', pdf => 'application/pdf', ttf => 'font/ttf', woff2 => 'font/woff2', so => 'application/octet-stream',
  gz => 'application/octet-stream', tgz => 'application/octet-stream', data => 'application/octet-stream', rds => 'application/octet-stream', zip => 'application/zip', sav => 'application/octet-stream');

# Fester Port: Projekte liegen im Browser je Adresse - mit demselben Port findet der Browser sie beim nächsten Start wieder.
my @ports = (47815 .. 47824); my ($server, $port);
for my $p (@ports) {
  $server = IO::Socket::INET->new(LocalAddr => '127.0.0.1', LocalPort => $p, Proto => 'tcp', Listen => 64, ReuseAddr => 1) and do { $port = $p; last };
  # Port belegt: läuft dort schon Statable? Dann nur den Browser öffnen.
  my $probe = IO::Socket::INET->new(PeerAddr => '127.0.0.1', PeerPort => $p, Proto => 'tcp', Timeout => 2) or next;
  print $probe "HEAD /index.html HTTP/1.0\r\n\r\n"; my $antwort = join '', <$probe>; close $probe;
  if ($antwort =~ /^X-Statable: offline/mi) { oeffne("http://127.0.0.1:$p/"); print "Statable läuft schon: http://127.0.0.1:$p/\n"; exit 0; }
}
die "Kein freier Port zwischen $ports[0] und $ports[-1].\n" unless $server;
my $url = "http://127.0.0.1:$port/";
print "\nStatable läuft ohne Netz: $url\n";
print "Hinweis: anderer Port als sonst ($ports[0]) - früher hier gespeicherte Projekte sind unter dieser Adresse nicht zu sehen.\n" if $port != $ports[0];
print "Dieses Fenster offen lassen. Schließen oder Ctrl+C beendet Statable.\n\n";
oeffne($url);

# Jede Verbindung in einem eigenen Prozess: eine offene, stille Verbindung (Browser öffnen sie gern vorab) hält sonst alle anderen auf
# (Testrunde 24.10.2026). Wer nach 30 s noch keine Anfrage geschickt hat, wird getrennt.
while (1) {
  my $c = $server->accept or next;
  my $kind = fork;
  if (!defined $kind) { bediene($c, 0); next }   # fork geht nicht: wie früher der Reihe nach
  if ($kind) { close $c; next }
  close $server; bediene($c, 1); exit 0;
}

sub bediene {
  my ($c, $kind) = @_;
  $c->autoflush(1);
  local $SIG{ALRM} = sub { close $c; exit 0 }; alarm 30 if $kind;
  my $zeile = <$c>; unless (defined $zeile) { close $c; return }
  while (my $h = <$c>) { last if $h =~ /^\r?\n$/ }
  alarm 0 if $kind;
  my ($methode, $pfad) = $zeile =~ m{^(GET|HEAD) (\S+)};
  unless ($methode) { antwort($c, 405, 'text/plain', 'nur GET', 0); return }
  $pfad =~ s/[?#].*//; $pfad =~ s/%([0-9A-Fa-f]{2})/chr(hex($1))/ge;
  $pfad = '/index.html' if $pfad eq '/';
  if ($pfad =~ m{(^|/)\.\.(/|$)} || $pfad =~ /\0/) { antwort($c, 403, 'text/plain', 'nein', 0); return }
  my $datei = $wurzel . $pfad;
  $datei .= '/index.html' if -d $datei;
  unless (-f $datei && open(my $fh, '<:raw', $datei)) { antwort($c, 404, 'text/plain; charset=utf-8', 'nicht gefunden', 0); return }
  else {
    my ($endung) = $datei =~ /\.([A-Za-z0-9]+)$/; my $t = $typ{lc($endung // '')} // 'application/octet-stream';
    my $groesse = -s $datei;
    print $c "HTTP/1.0 200 OK\r\nContent-Type: $t\r\nContent-Length: $groesse\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff\r\nX-Statable: offline\r\nConnection: close\r\n\r\n";
    if ($methode eq 'GET') { my $buf; while (read($fh, $buf, 65536)) { print $c $buf or last } }
    close $fh; close $c;
  }
}

sub antwort { my ($c, $code, $t, $text, $kopf) = @_; print $c "HTTP/1.0 $code X\r\nContent-Type: $t\r\nContent-Length: " . length($text) . "\r\nX-Statable: offline\r\nConnection: close\r\n\r\n$text"; close $c }
sub oeffne { my $u = shift; if ($^O eq 'darwin') { system('open', $u) } elsif ($^O =~ /linux|bsd/) { system("xdg-open '$u' >/dev/null 2>&1 &") } }
