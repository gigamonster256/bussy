{
  lib,
  stdenvNoCC,
  bun,
  imagemagick,
  makeBinaryWrapper,
  writableTmpDirAsHomeHook,
}:
let
  pname = "bussy";
  version = "0.1.1";
  src = ./.;

  node_modules = stdenvNoCC.mkDerivation {
    pname = "${pname}-node_modules";
    inherit version src;

    impureEnvVars = lib.fetchers.proxyImpureEnvVars ++ [
      "GIT_PROXY_COMMAND"
      "SOCKS_SERVER"
    ];

    nativeBuildInputs = [
      bun
      writableTmpDirAsHomeHook
    ];

    dontConfigure = true;

    buildPhase = ''
      runHook preBuild

      export BUN_INSTALL_CACHE_DIR=$(mktemp -d)

      bun install \
        --frozen-lockfile \
        --ignore-scripts \
        --no-progress

      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall

      mkdir -p $out
      cp -R node_modules $out/

      runHook postInstall
    '';

    # Required else we get errors that our fixed-output derivation references store paths
    dontFixup = true;

    outputHash = "sha256-kGrQTrd7UZ4Nhf0YgncOzvx3ftKqkWwB+YhoP+KmYfo=";
    outputHashAlgo = "sha256";
    outputHashMode = "recursive";
  };
in
stdenvNoCC.mkDerivation (finalAttrs: {
  inherit
    pname
    version
    src
    node_modules
    ;

  nativeBuildInputs = [
    bun
    imagemagick
    makeBinaryWrapper
  ];

  configurePhase = ''
    runHook preConfigure

    cp -R ${node_modules}/node_modules .

    runHook postConfigure
  '';

  buildPhase = ''
    runHook preBuild

    # Set version for client build
    export APP_VERSION="${finalAttrs.version}"

    bun run build

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    # Create output directories
    mkdir -p $out/lib/bussy $out/bin

    # Copy built artifacts
    cp -R dist $out/lib/bussy/

    # Copy drizzle migrations (needed at runtime for auto-migration)
    cp -R drizzle $out/lib/bussy/

    # Copy node_modules for native dependencies (mysql2, etc.)
    cp -R node_modules $out/lib/bussy/

    # Create wrapper script that runs from the lib directory
    # so relative paths (dist/client, drizzle/) resolve correctly
    makeBinaryWrapper ${lib.getExe bun} $out/bin/bussy \
      --chdir $out/lib/bussy \
      --add-flags "dist/server/Program.js"

    runHook postInstall
  '';

  meta = {
    description = "Texas A&M bus departure notification service";
    homepage = "https://github.com/gigamonster256/bussy";
    license = lib.licenses.mit;
    platforms = lib.platforms.unix;
    mainProgram = "bussy";
  };
})
