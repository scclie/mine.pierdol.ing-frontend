{
  description = "mine frontend static development shell";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
    in
    {
      devShells = nixpkgs.lib.genAttrs systems (system:
        let
          pkgs = import nixpkgs { inherit system; };
          # Reuse the original project's verified release reference on x86_64.
          # Never install that architecture's executable into an aarch64 shell.
          zine = if system == "x86_64-linux" then
            pkgs.stdenvNoCC.mkDerivation {
              pname = "zine";
              version = "0.13.0";
              src = pkgs.fetchurl {
                url = "https://github.com/kristoff-it/zine/releases/download/v0.13.0/x86_64-linux-musl.tar.xz";
                hash = "sha256-wlDgKdl4kBsMmjjqsKhg7524db9ob+Dwq/YfGAwoDbo=";
              };
              unpackPhase = "tar --extract --file=$src --xz";
              installPhase = "install -Dm755 zine $out/bin/zine";
            }
          else if pkgs ? zine && pkgs.zine.version == "0.13.0" then
            pkgs.zine
          else
            throw "aarch64-linux requires a verified native Zine 0.13.0 package or release hash";
        in
        {
          default = pkgs.mkShell {
            packages = [ pkgs.nodejs zine ];
          };
        });
    };
}
