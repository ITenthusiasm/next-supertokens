import fs from "node:fs/promises";
import path from "node:path";
import "dotenv/config";

const root = path.resolve(new URL(import.meta.url).pathname, "../../");
const commandLineArguments = process.argv.slice(2);
const router = commandLineArguments[0] ?? process.env.ROUTER;

if (router !== "app" && router !== "pages") {
  console.error('Error: `use-router` script must be called with a valid router ("app" or "pages")\n');
  process.exitCode = 1;
} else {
  console.log(`\x1b[35mUsing ${capitalize(router)} Router...\x1b[0m`);
  const srcDirectory = path.resolve(root, "src");
  await removeDirectory(srcDirectory);
  await copyFiles(path.resolve(root, `templates/${router}-router`), srcDirectory);
}

/**
 * Deletes all of the files/folders in the specified directory (including the target directory itself)
 * @param {string} directoryPath The path to the directory that should be deleted
 * @returns {Promise<void>}
 */
async function removeDirectory(directoryPath) {
  try {
    const filenames = await fs.readdir(directoryPath);

    await Promise.all(
      filenames.map(async (f) => {
        const filepath = path.resolve(directoryPath, f);
        if ((await fs.stat(filepath)).isDirectory()) return removeDirectory(filepath);

        return fs.rm(filepath);
      }),
    );

    return fs.rmdir(directoryPath);
  } catch (error) {
    const errorCode = /** @type {NodeJS.ErrnoException} */ (error).code;
    if (errorCode !== "ENOENT") throw error;
  }
}

/**
 * Recursively copies all of the files/folders from the `sourceDirectory` to the `targetDirectory`.
 * (Automatically creates new directories if needed.)
 * @param {string} sourceDirectory
 * @param {string} targetDirectory
 * @returns {Promise<void>}
 */
async function copyFiles(sourceDirectory, targetDirectory) {
  if (!(await fs.stat(sourceDirectory)).isDirectory()) {
    throw new TypeError(`\`sourceDirectory\` path "${sourceDirectory}" does not point to a directory`);
  }

  try {
    if (!(await fs.stat(targetDirectory)).isDirectory()) {
      throw new TypeError(`\`targetDirectory\` path "${targetDirectory}" does not point to a directory`);
    }
  } catch (error) {
    const errorCode = /** @type {NodeJS.ErrnoException} */ (error).code;
    if (errorCode !== "ENOENT") throw error;
    await fs.mkdir(targetDirectory, { recursive: true });
  }

  const filenames = await fs.readdir(sourceDirectory);
  await Promise.all(
    filenames.map(async (f) => {
      if (f === "tsconfig.json") return; // Don't copy `TSConfig`. (Use root configuration instead.)

      const filepath = path.resolve(sourceDirectory, f);
      const fileStats = await fs.lstat(filepath);
      if (fileStats.isDirectory()) return copyFiles(filepath, path.resolve(targetDirectory, f));

      // NOTE: `trueFilepath` assumes that `readlink` returns a string starting with `templates/`.
      const trueFilepath = fileStats.isSymbolicLink() ? path.resolve(root, await fs.readlink(filepath)) : filepath;
      return fs.copyFile(trueFilepath, path.resolve(targetDirectory, f));
    }),
  );
}

/**
 * Capitalizes the first letter in a string
 * @template {string} T
 * @param {T} string
 * @returns {Capitalize<T>}
 */
function capitalize(string) {
  return /** @type {Capitalize<T>} */ (string.charAt(0).toUpperCase() + string.slice(1));
}
