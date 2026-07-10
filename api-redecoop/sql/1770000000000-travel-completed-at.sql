-- =============================================================================
-- Migration: travel.completed_at
-- Feature: Finalizar viagem (CoopFrete / Viagens Disponíveis)
-- Data: 2026-06-27
--
-- UP   → adiciona coluna completed_at na tabela travel
-- DOWN → remove a coluna (rollback)
-- =============================================================================

-- ── UP ──────────────────────────────────────────────────────────────────────
ALTER TABLE `travel`
  ADD COLUMN `completed_at` timestamp NULL DEFAULT NULL;

-- Registrar no controle de migrations do TypeORM (evita rodar de novo via npm)
INSERT INTO `migrations` (`timestamp`, `name`)
SELECT 1770000000000, 'TravelCompletedAt1770000000000'
WHERE NOT EXISTS (
  SELECT 1 FROM `migrations` WHERE `name` = 'TravelCompletedAt1770000000000'
);

-- ── DOWN (rollback — só se precisar desfazer) ───────────────────────────────
-- DELETE FROM `migrations` WHERE `name` = 'TravelCompletedAt1770000000000';
-- ALTER TABLE `travel` DROP COLUMN `completed_at`;
