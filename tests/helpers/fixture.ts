export async function loadFixture<T>(name: string): Promise<T> {
  const file = Bun.file(`${import.meta.dir}/../fixtures/${name}.json`);

  if (!(await file.exists())) {
    throw new Error(`Fixture not found: ${name}`);
  }

  return (await file.json()) as T;
}
