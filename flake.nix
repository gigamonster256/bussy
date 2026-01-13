{
  inputs = {
    # nixpkgs.url = "github:cachix/devenv-nixpkgs/rolling";
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    systems.url = "github:nix-systems/default";
    devenv.url = "github:cachix/devenv";
    devenv.inputs.nixpkgs.follows = "nixpkgs";
  };

  # nixConfig = {
  #   extra-trusted-public-keys = "devenv.cachix.org-1:w1cLUi8dv3hnoSPGAuibQv+f9TZLr6cv/Hm9XgU50cw=";
  #   extra-substituters = "https://devenv.cachix.org";
  # };

  outputs =
    {
      self,
      nixpkgs,
      devenv,
      systems,
      ...
    }@inputs:
    let
      forEachSystem = nixpkgs.lib.genAttrs (import systems);
    in
    {
      packages = forEachSystem (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          # # also see https://gist.github.com/NobbZ/1603ba65e135bf293a50c4b98eb41f71 for smaller image sizes
          mixNixDeps = pkgs.callPackages ./deps.nix { beamPackages = pkgs.beamMinimalPackages; };
        in
        rec {
          devenv-up = self.devShells.${system}.default.config.procfileScript;

          # docker = pkgs.dockerTools.buildLayeredImage {
          #   name = "portal";
          #   tag = "latest";
          #   # put 'server' and 'migrate' in /bin for overriding Cmd
          #   contents = [ portal ];
          #   config.Cmd = [ "${portal}/bin/server" ];
          #   config.Env = [
          #     # locale info
          #     "LC_ALL=C.UTF-8"
          #     # do not try to set up name with epmd (not a clustered app)
          #     "RELEASE_DISTRIBUTION=none"
          #   ];
          # };
        }
      );

      formatter = forEachSystem (system: nixpkgs.legacyPackages.${system}.nixfmt-tree);

      devShells = forEachSystem (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = devenv.lib.mkShell {
            inherit inputs pkgs;
            modules = [
              (
                {
                  lib,
                  pkgs,
                  config,
                  ...
                }:
                {
                  packages = [ 
                    pkgs.bun
                    pkgs.imagemagick
                  ] ++ lib.optional pkgs.stdenv.isLinux pkgs.inotify-tools;
                  languages.typescript.enable = true;
                  services.mysql = {
                    enable = true;
                    ensureUsers = [
                      {
                        name = "bussy";
                        password = "bussy";
                        ensurePermissions = {
                          "bussy_dev.*" = "ALL PRIVILEGES";
                          "bussy_test.*" = "ALL PRIVILEGES";
                        };
                      }
                    ];
                    initialDatabases = [
                      { name = "bussy_dev"; }
                      { name = "bussy_test"; }
                    ];
                  };
                  git-hooks.hooks = {
                    # alejandra.enable = true;
                    # alejandra.settings.exclude = [ "deps.nix" ];
                    # mix-format.enable = true;
                  };
                  env = {
                    # MIX_ARCHIVES = "${config.devenv.root}/.mix";
                  };
                }
              )
            ];
          };
        }
      );
    };
}
