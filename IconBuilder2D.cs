using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

class IconBuilder2D {
    static void Main() {
        int size = 256;
        using (Bitmap bmp = new Bitmap(size, size))
        using (Graphics g = Graphics.FromImage(bmp)) {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;

            // Background dark slate rounded box
            using (SolidBrush bgBrush = new SolidBrush(Color.FromArgb(18, 22, 31))) {
                g.FillRectangle(bgBrush, 0, 0, size, size);
            }

            // Outer cyan border
            using (Pen borderPen = new Pen(Color.FromArgb(56, 189, 248), 6f)) {
                g.DrawRectangle(borderPen, 3, 3, size - 6, size - 6);
            }

            // Blueprint grid background lines
            using (Pen gridPen = new Pen(Color.FromArgb(30, 41, 59), 1.5f)) {
                for (int i = 32; i < size; i += 32) {
                    g.DrawLine(gridPen, i, 0, i, size);
                    g.DrawLine(gridPen, 0, i, size, i);
                }
            }

            // 2D CAD Geometry: Circle, Rectangle, Arc
            using (Pen geomPen = new Pen(Color.FromArgb(56, 189, 248), 3f)) {
                g.DrawEllipse(geomPen, 40, 40, 176, 176);
                g.DrawRectangle(geomPen, 65, 65, 126, 126);
            }

            // Precision Red Crosshair Cursor
            using (Pen crossPen = new Pen(Color.FromArgb(239, 68, 68), 2.5f)) {
                g.DrawLine(crossPen, 128, 20, 128, 236);
                g.DrawLine(crossPen, 20, 128, 236, 128);
            }

            // Center Pickbox
            using (SolidBrush pickBrush = new SolidBrush(Color.FromArgb(239, 68, 68))) {
                g.FillRectangle(pickBrush, 121, 121, 14, 14);
            }

            // Typography "2D"
            using (Font font = new Font("Segoe UI", 26f, FontStyle.Bold))
            using (SolidBrush textBrush = new SolidBrush(Color.White))
            using (StringFormat sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center }) {
                g.DrawString("2D", font, textBrush, 128f, 85f, sf);
            }

            // Typography "XCAD"
            using (Font fontSub = new Font("Segoe UI", 16f, FontStyle.Bold))
            using (SolidBrush subBrush = new SolidBrush(Color.FromArgb(56, 189, 248)))
            using (StringFormat sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center }) {
                g.DrawString("XCAD", fontSub, subBrush, 128f, 175f, sf);
            }

            string outPng = @"C:\Users\HP\.gemini\antigravity\scratch\autocad-2d-practice\app_icon.png";
            string outIco = @"C:\Users\HP\.gemini\antigravity\scratch\autocad-2d-practice\app_icon.ico";
            bmp.Save(outPng, ImageFormat.Png);

            // Save multi-resolution Icon
            IntPtr hIcon = bmp.GetHicon();
            using (Icon icon = Icon.FromHandle(hIcon))
            using (FileStream fs = new FileStream(outIco, FileMode.Create)) {
                icon.Save(fs);
            }

            Console.WriteLine("Successfully created 2D app_icon.ico and app_icon.png");
        }
    }
}
