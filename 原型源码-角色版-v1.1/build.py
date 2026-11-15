import pathlib
base = pathlib.Path(__file__).resolve().parent
html = (base/'shell.html').read_text(encoding='utf-8')
css  = (base/'base.css').read_text(encoding='utf-8')
js_files = ['data.js','data-ext.js','data-dict.js','data-vals.js','data-f47.js','data-v12.js','data-dd.js','data-cust.js','core.js','pages-shared.js','pages-archive.js','pages-r04.js','pages-r01.js','pages-elem.js','pages-std.js','pages-dict.js','pages-nd.js','pages-cust.js','pages-r02.js','pages-vers.js']
js = '\n\n'.join((base/f).read_text(encoding='utf-8') for f in js_files if (base/f).exists())

outdir = base.parent

targets = [
    ('融敢平台-角色版-v1.2.html', False),
    ('融敢平台-解释版.html', True),
]
for name, explain in targets:
    flag = 'window.__XPL__ = %s;\n' % ('true' if explain else 'false')
    out = html.replace('/*__CSS__*/', css).replace('/*__JS__*/', flag + js)
    dest = outdir/name
    dest.write_text(out, encoding='utf-8')
    print('written', dest.name, len(out), 'explain=' + str(explain))
