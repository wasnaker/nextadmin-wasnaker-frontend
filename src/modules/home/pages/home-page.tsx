import { Stack, Text, Title } from '@mantine/core';
import { useT } from '@wasnaker/web-core';

/** Page sementara — wajah Mantine menyusul; menu/route tetap muncul. */
export function HomePage() {
  const t = useT();
  return (
    <Stack>
      <Title order={3}>Home</Title>
      <Text size="sm" c="dimmed">{t('Not available in this host yet.')}</Text>
    </Stack>
  );
}
