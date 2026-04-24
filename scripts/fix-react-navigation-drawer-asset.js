const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const moduleFile = path.join(
  projectRoot,
  'node_modules',
  '@react-navigation',
  'drawer',
  'lib',
  'module',
  'views',
  'DrawerToggleButton.js'
);

const sourceFile = path.join(
  projectRoot,
  'node_modules',
  '@react-navigation',
  'drawer',
  'src',
  'views',
  'DrawerToggleButton.tsx'
);

const moduleContents = `"use strict";

import { HeaderButton } from '@react-navigation/elements';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';
import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
export function DrawerToggleButton({
  tintColor,
  accessibilityLabel = 'Show navigation menu',
  ...rest
}) {
  const navigation = useNavigation();
  return /*#__PURE__*/_jsx(HeaderButton, {
    ...rest,
    accessibilityLabel: accessibilityLabel,
    onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()),
    children: /*#__PURE__*/_jsxs(View, {
      style: styles.icon,
      children: [0, 1, 2].map(index => /*#__PURE__*/_jsx(View, {
        style: [styles.bar, {
          backgroundColor: tintColor ?? '#1f2937'
        }]
      }, index))
    })
  });
}
const styles = StyleSheet.create({
  icon: {
    height: 24,
    width: 24,
    marginVertical: 8,
    marginHorizontal: 5,
    justifyContent: 'center',
    gap: 3
  },
  bar: {
    height: 2,
    width: 18,
    borderRadius: 999
  }
});
//# sourceMappingURL=DrawerToggleButton.js.map
`;

const sourceContents = `import { HeaderButton } from '@react-navigation/elements';
import {
  DrawerActions,
  type ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';

import type { DrawerNavigationProp } from '../types';

type Props = {
  accessibilityLabel?: string;
  pressColor?: string;
  pressOpacity?: number;
  tintColor?: string;
};

export function DrawerToggleButton({
  tintColor,
  accessibilityLabel = 'Show navigation menu',
  ...rest
}: Props) {
  const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();

  return (
    <HeaderButton
      {...rest}
      accessibilityLabel={accessibilityLabel}
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
    >
      <View style={styles.icon}>
        <View
          style={[
            styles.bar,
            {
              backgroundColor: tintColor ?? '#1f2937',
            },
          ]}
        />
        <View
          style={[
            styles.bar,
            {
              backgroundColor: tintColor ?? '#1f2937',
            },
          ]}
        />
        <View
          style={[
            styles.bar,
            {
              backgroundColor: tintColor ?? '#1f2937',
            },
          ]}
        />
      </View>
    </HeaderButton>
  );
}

const styles = StyleSheet.create({
  icon: {
    height: 24,
    width: 24,
    marginVertical: 8,
    marginHorizontal: 5,
    justifyContent: 'center',
    gap: 3,
  },
  bar: {
    height: 2,
    width: 18,
    borderRadius: 999,
  },
});
`;

for (const [filePath, contents] of [
  [moduleFile, moduleContents],
  [sourceFile, sourceContents],
]) {
  if (!fs.existsSync(filePath)) {
    continue;
  }

  fs.writeFileSync(filePath, contents);
  console.log(`Patched ${path.relative(projectRoot, filePath)}`);
}

const assetDir = path.join(
  projectRoot,
  'node_modules',
  '@react-navigation',
  'drawer',
  'lib',
  'module',
  'views',
  'assets'
);

for (const scale of ['1x', '2x', '3x', '4x']) {
  const androidAsset = path.join(
    assetDir,
    `toggle-drawer-icon@${scale}.android.png`
  );
  const genericAsset = path.join(assetDir, `toggle-drawer-icon@${scale}.png`);

  if (!fs.existsSync(androidAsset) || fs.existsSync(genericAsset)) {
    continue;
  }

  fs.copyFileSync(androidAsset, genericAsset);
  console.log(`Created ${path.relative(projectRoot, genericAsset)}`);
}

const iconFontsSourceDir = path.join(
  projectRoot,
  'node_modules',
  'react-native-vector-icons',
  'Fonts'
);

const iconFontsTargetDir = path.join(
  projectRoot,
  'android',
  'app',
  'src',
  'main',
  'assets',
  'fonts'
);

if (fs.existsSync(iconFontsSourceDir)) {
  fs.mkdirSync(iconFontsTargetDir, { recursive: true });

  for (const fileName of fs.readdirSync(iconFontsSourceDir)) {
    const sourcePath = path.join(iconFontsSourceDir, fileName);
    const targetPath = path.join(iconFontsTargetDir, fileName);

    if (!fs.statSync(sourcePath).isFile()) {
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
    console.log(`Copied ${path.relative(projectRoot, targetPath)}`);
  }
}

const qrGenMatrixFile = path.join(
  projectRoot,
  'node_modules',
  'react-native-qrcode-svg',
  'src',
  'genMatrix.js'
);

if (fs.existsSync(qrGenMatrixFile)) {
  const qrGenMatrixContents = fs.readFileSync(qrGenMatrixFile, 'utf8');
  const oldImport = "import QRCode from 'qrcode'";
  const newImport = "import QRCode from 'qrcode/lib/core/qrcode'";

  if (qrGenMatrixContents.includes(oldImport)) {
    fs.writeFileSync(
      qrGenMatrixFile,
      qrGenMatrixContents.replace(oldImport, newImport)
    );
    console.log(`Patched ${path.relative(projectRoot, qrGenMatrixFile)}`);
  }
}

const reactNativeSvgPackageFile = path.join(
  projectRoot,
  'node_modules',
  'react-native-svg',
  'package.json'
);

if (fs.existsSync(reactNativeSvgPackageFile)) {
  const reactNativeSvgPackage = JSON.parse(
    fs.readFileSync(reactNativeSvgPackageFile, 'utf8')
  );

  if (reactNativeSvgPackage['react-native'] !== 'lib/module/index.js') {
    reactNativeSvgPackage['react-native'] = 'lib/module/index.js';
    fs.writeFileSync(
      reactNativeSvgPackageFile,
      `${JSON.stringify(reactNativeSvgPackage, null, 2)}\n`
    );
    console.log(
      `Patched ${path.relative(projectRoot, reactNativeSvgPackageFile)}`
    );
  }
}
