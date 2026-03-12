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
        in
        {
          default = self.packages.${system}.bussy;
          bussy = pkgs.callPackage ./package.nix { };
          devenv-up = self.devShells.${system}.default.config.procfileScript;

          docker = pkgs.dockerTools.buildLayeredImage {
            name = "bussy";
            tag = "latest";
            # contents = [ self.packages.${system}.bussy ];
            config.Cmd = [ "${pkgs.lib.getExe self.packages.${system}.bussy}" ];
            config.Env = [
              "LC_ALL=C.UTF-8"
            ];
          };
        }
      );

      overlays = {
        default = self.overlays.bussy;
        bussy = final: prev: {
          inherit (self.packages.${prev.stdenv.hostPlatform.system}) bussy;
        };
      };

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
                    pkgs.python3
                  ]
                  ++ lib.optional pkgs.stdenv.isLinux pkgs.inotify-tools;
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
