import type { CanvasFrameSnapshot, CanvasThemePalette } from "./shooterSimVisuals";
export {
  readCanvasThemePalette,
  type CanvasExplosion,
  type CanvasFrameSnapshot,
  type CanvasPopup,
  type CanvasShot,
  type CanvasThemePalette,
} from "./shooterSimVisuals";

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function renderShooterCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  snapshot: CanvasFrameSnapshot,
  palette: CanvasThemePalette,
  reducedMotion: boolean,
): void {
  if (width <= 0 || height <= 0) return;

  ctx.clearRect(0, 0, width, height);

  // Subtle dot grid
  ctx.fillStyle = palette.mutedForeground;
  ctx.globalAlpha = 0.14;
  const gridStep = 22;
  for (let gx = 12; gx < width; gx += gridStep) {
    for (let gy = 12; gy < height; gy += gridStep) {
      ctx.fillRect(gx, gy, 1.5, 1.5);
    }
  }
  ctx.globalAlpha = 1;

  // Danger zone glow when any enemy is past 65%
  const hasDanger = !snapshot.practiceMode && snapshot.enemies.some((e) => e.y > 65);
  if (hasDanger) {
    const grad = ctx.createLinearGradient(0, height * 0.58, 0, height);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(1, "rgba(239, 68, 68, 0.18)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, height * 0.58, width, height * 0.42);
  }

  // Slow-time field tint
  if (snapshot.slowTimeRemaining > 0) {
    ctx.fillStyle = "rgba(56, 189, 248, 0.08)";
    ctx.fillRect(0, 0, width, height);
    const barW = Math.max(
      0,
      Math.min(1, snapshot.slowTimeRemaining / Math.max(1, snapshot.slowTimeDuration)) *
        (width - 24),
    );
    ctx.fillStyle = palette.accent;
    ctx.globalAlpha = 0.65;
    ctx.fillRect(12, 6, barW, 3);
    ctx.globalAlpha = 1;
  }

  // Shield / defense line
  const defenseY = height * 0.88;
  ctx.save();
  ctx.strokeStyle =
    snapshot.shieldFlash > 0
      ? palette.accent
      : snapshot.shieldCharges > 0
        ? palette.accent
        : snapshot.practiceMode
          ? palette.mutedForeground
          : palette.primary;
  ctx.globalAlpha = snapshot.shieldFlash > 0 ? 0.95 : snapshot.shieldCharges > 0 ? 0.65 : 0.35;
  ctx.lineWidth = snapshot.shieldFlash > 0 ? 3 : snapshot.shieldCharges > 0 ? 2 : 1.25;
  ctx.setLineDash(snapshot.practiceMode ? [6, 6] : []);
  ctx.beginPath();
  ctx.moveTo(0, defenseY);
  ctx.lineTo(width, defenseY);
  ctx.stroke();
  ctx.restore();

  // Laser shots
  for (const shot of snapshot.shots) {
    const progress = Math.min(1, shot.age / Math.max(0.01, shot.duration));
    const sx = (shot.startX / 100) * width;
    const sy = (shot.startY / 100) * height;
    const tx = (shot.targetX / 100) * width;
    const ty = (shot.targetY / 100) * height;
    ctx.save();
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = reducedMotion ? 2 : 2.5;
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.restore();
  }

  // Enemies
  const isCompact = width < 480;
  const baseFontPx = isCompact ? 17 : 15;

  for (const enemy of snapshot.enemies) {
    const isTarget = enemy.id === snapshot.targetId;
    const isDanger = !snapshot.practiceMode && enemy.y > 65;
    const fontPx = enemy.boss ? baseFontPx + 2 : baseFontPx;
    ctx.font = `600 ${fontPx}px ${palette.fontMono}`;

    const typedPart = enemy.word.slice(0, enemy.typed);
    const nextChar = enemy.word[enemy.typed] ?? "";
    const remainingPart = enemy.word.slice(enemy.typed + 1);
    const textW = ctx.measureText(enemy.word).width;
    const badgePad = enemy.boss ? 44 : isTarget ? 18 : 0;
    const pillW = textW + 24 + badgePad;
    const pillH = fontPx + 14;

    const rawX = (enemy.x / 100) * width;
    const clampedCenterX = Math.max(pillW / 2 + 8, Math.min(width - pillW / 2 - 8, rawX));
    const px = clampedCenterX - pillW / 2;
    const py = Math.max(6, Math.min(height - pillH - 22, (enemy.y / 100) * height));

    ctx.save();
    drawRoundedRect(ctx, px, py, pillW, pillH, 10);
    ctx.fillStyle = enemy.boss
      ? "rgba(239, 68, 68, 0.22)"
      : isTarget
        ? "rgba(245, 158, 11, 0.16)"
        : isDanger
          ? "rgba(239, 68, 68, 0.15)"
          : palette.secondary;
    ctx.fill();

    ctx.lineWidth = isTarget || enemy.boss ? 2 : 1;
    ctx.strokeStyle = enemy.boss
      ? palette.destructive
      : isTarget
        ? palette.primary
        : isDanger
          ? palette.destructive
          : palette.border;
    ctx.stroke();

    let cursorX = px + 12;
    const textY = py + pillH / 2 + fontPx * 0.35;

    if (enemy.boss) {
      ctx.font = `700 10px ${palette.fontMono}`;
      ctx.fillStyle = palette.destructive;
      ctx.fillText("BOSS", cursorX, py + pillH / 2 + 3.5);
      cursorX += 34;
      ctx.font = `700 ${fontPx}px ${palette.fontMono}`;
    } else if (isTarget) {
      ctx.fillStyle = palette.primary;
      ctx.beginPath();
      ctx.arc(cursorX + 4, py + pillH / 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      cursorX += 14;
    }

    if (typedPart) {
      ctx.fillStyle = palette.accent;
      ctx.fillText(typedPart, cursorX, textY);
      cursorX += ctx.measureText(typedPart).width;
    }

    if (nextChar) {
      ctx.fillStyle = palette.primary;
      ctx.font = `800 ${fontPx}px ${palette.fontMono}`;
      const nextW = ctx.measureText(nextChar).width;
      ctx.fillText(nextChar, cursorX, textY);
      ctx.fillRect(cursorX, textY + 2.5, nextW, 2);
      cursorX += nextW;
      ctx.font = `${enemy.boss ? 700 : 600} ${fontPx}px ${palette.fontMono}`;
    }

    if (remainingPart) {
      ctx.fillStyle = palette.foreground;
      ctx.globalAlpha = 0.85;
      ctx.fillText(remainingPart, cursorX, textY);
    }

    ctx.restore();
  }

  // Explosions (particle burst only when reducedMotion is false)
  if (!reducedMotion) {
    for (const exp of snapshot.explosions) {
      const progress = Math.min(1, exp.age / Math.max(0.01, exp.duration));
      const cx = (exp.x / 100) * width;
      const cy = (exp.y / 100) * height;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - progress);
      for (const p of exp.particles) {
        ctx.fillStyle =
          p.colorKey === "accent"
            ? palette.accent
            : p.colorKey === "destructive"
              ? palette.destructive
              : palette.primary;
        const px = cx + p.dx * progress * 1.4;
        const py = cy + p.dy * progress * 1.4;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1, p.size * (1 - progress * 0.5)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Score & powerup popups
  for (const pop of snapshot.popups) {
    const progress = Math.min(1, pop.age / Math.max(0.01, pop.duration));
    const px = (pop.x / 100) * width;
    const py = (pop.y / 100) * height - (reducedMotion ? 8 : progress * 34);
    ctx.save();
    ctx.font = `700 13px ${palette.fontMono}`;
    ctx.textAlign = "center";
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.fillStyle =
      pop.tone === "accent"
        ? palette.accent
        : pop.tone === "destructive"
          ? palette.destructive
          : palette.primary;
    ctx.fillText(pop.text, Math.max(36, Math.min(width - 36, px)), Math.max(18, py));
    ctx.restore();
  }

  // Player cannon ship at bottom
  const shipPx = Math.max(22, Math.min(width - 22, (snapshot.shipX / 100) * width));
  const shipTop = height - 28;
  ctx.save();
  ctx.fillStyle = palette.primary;
  ctx.fillRect(shipPx - 3, shipTop - 8, 6, 10);
  drawRoundedRect(ctx, shipPx - 15, shipTop, 30, 14, 5);
  ctx.fillStyle = palette.secondary;
  ctx.fill();
  ctx.strokeStyle = snapshot.shieldCharges > 0 ? palette.accent : palette.primary;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}
