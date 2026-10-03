import { useState, type PropsWithChildren } from 'react';
import { useWindowDimensions } from 'react-native';
import { colors } from '../ui';
import { PREVIEW_DEVICE, fitPreviewScale } from './device';
import { PreviewAdminPanel } from './PreviewAdminPanel';
import { PreviewOverlayContext } from './PreviewOverlayContext';

export function PreviewFrame({ children }: PropsWithChildren) {
  const { width, height } = useWindowDimensions();
  const [fit, setFit] = useState(true);
  const [overlayHost, setOverlayHost] = useState<HTMLDivElement | null>(null);
  const sideBySide = width >= 900;
  const scale = fit ? fitPreviewScale(width, height, sideBySide) : 1;
  const frameWidth = PREVIEW_DEVICE.width + PREVIEW_DEVICE.bezel * 2;
  const frameHeight = PREVIEW_DEVICE.height + PREVIEW_DEVICE.bezel * 2;
  return (
    <main style={{ height: '100dvh', overflow: 'auto', boxSizing: 'border-box', padding: sideBySide ? '24px 32px' : '20px 16px', background: 'radial-gradient(ellipse at 30% 25%, #E1EDE4, #F4F6F4 65%)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ margin: '0 auto', width: 'max-content', minWidth: sideBySide ? 680 : 0, maxWidth: '100%' }}>
        <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><span style={{ color: colors.primary, fontSize: 18, fontWeight: 800 }}>KU래쪄용</span><span style={{ color: colors.muted, fontSize: 10, letterSpacing: 1.5 }}>MOBILE PREVIEW</span></div>
        <div style={{ display: 'flex', flexDirection: sideBySide ? 'row' : 'column', alignItems: sideBySide ? 'flex-start' : 'center', gap: sideBySide ? 32 : 24 }}>
          <div>
            <div style={{ position: 'relative', width: frameWidth * scale, height: frameHeight * scale }}>
              <div data-testid="phone-frame" style={{ position: 'absolute', left: 0, top: 0, width: frameWidth, height: frameHeight, transform: `scale(${scale})`, transformOrigin: 'top left', background: '#202823', padding: PREVIEW_DEVICE.bezel, boxSizing: 'border-box', borderRadius: 60, boxShadow: '0 22px 65px rgba(19, 45, 30, 0.18), 0 0 0 1px #8B9890' }}>
                <div data-testid="phone-screen" style={{ position: 'relative', width: PREVIEW_DEVICE.width, height: PREVIEW_DEVICE.height, borderRadius: 52, overflow: 'hidden', background: colors.surface }}>
                  <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: PREVIEW_DEVICE.topInset, background: '#FFFFFF', zIndex: 2 }}>
                    <span style={{ position: 'absolute', left: 34, top: 21, fontSize: 15, fontWeight: 700, color: '#1F3028' }}>9:41</span>
                    <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 13, width: 120, height: 33, background: '#161B17', borderRadius: 20 }} />
                    <div style={{ position: 'absolute', right: 30, top: 24, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700 }}><span>5G</span><div style={{ width: 23, height: 11, border: '1px solid #65746A', padding: 1, borderRadius: 3, boxSizing: 'border-box' }}><div style={{ height: '100%', width: '85%', background: '#1F3028', borderRadius: 1 }} /></div></div>
                  </div>
                  <PreviewOverlayContext.Provider value={overlayHost}>
                    <div style={{ position: 'absolute', top: PREVIEW_DEVICE.topInset, bottom: PREVIEW_DEVICE.bottomInset, left: 0, right: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{children}</div>
                  </PreviewOverlayContext.Provider>
                  <div aria-hidden="true" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: PREVIEW_DEVICE.bottomInset, background: '#FFFFFF' }}><div style={{ width: 144, height: 5, background: '#202823', borderRadius: 3, position: 'absolute', left: '50%', bottom: 9, transform: 'translateX(-50%)' }} /></div>
                  <div ref={setOverlayHost} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }} />
                </div>
              </div>
            </div>
            <p style={{ margin: '12px 0 0', textAlign: 'center', color: colors.muted, fontSize: 11 }}>iPhone 18 Pro Max · 440 × 956</p>
          </div>
          <aside aria-label="시연 관리자 패널"><PreviewAdminPanel scale={scale} fit={fit} onFitChange={setFit} /></aside>
        </div>
      </div>
    </main>
  );
}
