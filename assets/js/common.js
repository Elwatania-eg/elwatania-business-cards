<script>
// Single global object to avoid polluting scope
window.AppBoot = (function(){
  // Helper to open/close Bulma modal
  function hookModal(modalId, openBtnId){
    const modal = document.getElementById(modalId);
    const openBtn = document.getElementById(openBtnId);
    const closeEls = modal.querySelectorAll('.delete, .modal-background, .modal-card-foot .button');

    function open(){ modal.classList.add('is-active'); }
    function close(){ modal.classList.remove('is-active'); }

    if(openBtn) openBtn.addEventListener('click', open);
    closeEls.forEach(el => el.addEventListener('click', close));
  }

  // Build Products tree from products/products.json (brand logos + PDF links)
  async function buildProductsTree(rootPath){
    const tree = document.getElementById('productsTree');
    tree.innerHTML = '<p>Loading…</p>';
    const res = await fetch(rootPath + 'products/products.json');
    const data = await res.json();
    const ul = document.createElement('ul');
    ul.className = 'menu-list';
    data.brands.forEach(brand => {
      const li = document.createElement('li');
      li.className = 'tree-brand';

      const row = document.createElement('div');
      row.className = 'brand-row';
      row.innerHTML = `<img src="${rootPath}${brand.logo}" alt="${brand.name} logo"> <strong>${brand.name}</strong>`;
      li.appendChild(row);

      const inner = document.createElement('ul');
      inner.className = 'menu-list hidden';
      (brand.pdfs || []).forEach(pdf => {
        const liPdf = document.createElement('li');
        liPdf.innerHTML = `<a href="${rootPath}${pdf.file}" target="_blank" rel="noopener">${pdf.title}</a>`;
        inner.appendChild(liPdf);
      });
      li.appendChild(inner);

      row.addEventListener('click', ()=> inner.classList.toggle('hidden'));
      ul.appendChild(li);
    });
    tree.innerHTML = '';
    tree.appendChild(ul);
  }

  // Build team grid on root page from data/team.json
  async function buildTeamGrid(){
    const grid = document.getElementById('teamGrid');
    const res = await fetch('data/team.json');
    const data = await res.json();
    grid.innerHTML = '';
    data.members.forEach(m => {
      const col = document.createElement('div');
      col.className = 'column is-4-desktop is-6-tablet is-12-mobile';
      col.innerHTML = `
        <a class="box team-card" href="${m.slug}/">
          <p class="title is-6" style="margin-bottom:4px;">${m.first} ${m.last}</p>
          <p class="subtitle is-7" style="margin-bottom:8px;">${m.title}</p>
          <span class="icon-text">
            <span class="icon"><i class="fa-solid fa-arrow-right"></i></span>
            <span>Open card</span>
          </span>
        </a>
      `;
      grid.appendChild(col);
    });
  }

  // vCard generator (returns a Blob URL)
  function makeVCardFor(person, company, pageUrl){
    // vCard 3.0, minimal fields
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${person.last};${person.first};;;`,
      `FN:${person.first} ${person.last}`,
      `TITLE:${person.title}`,
      `ORG:${company.name}`,
      `TEL;TYPE=WORK,VOICE:${company.landline}`,
      `TEL;TYPE=CELL,VOICE:${person.mobile}`,
      `EMAIL;TYPE=INTERNET:${person.email}`,
      `ADR;TYPE=WORK:;;${company.addresses.main_office};;;;Egypt`,
      `ADR;TYPE=WORK:;;${company.addresses.branch};;;;Egypt`,
      `ADR;TYPE=WORK:;;${company.addresses.showroom};;;;Egypt`,
      `URL:${pageUrl}`,
      'END:VCARD'
    ];
    const blob = new Blob([lines.join('\n')], {type: 'text/vcard'});
    return URL.createObjectURL(blob);
  }

  // Utility: WhatsApp wa.me link needs digits only (no + or spaces)
  function makeWhatsAppLink(phonePlus){
    const digits = (phonePlus || '').replace(/\D/g,''); // strip non-digits
    return `https://wa.me/${digits}`;
  }

  // Person page renderer
  async function renderPersonPage(root, slug){
    // Fetch config
    const [teamRes, productsRes] = await Promise.all([
      fetch(root + 'data/team.json'),
      fetch(root + 'products/products.json')
    ]);
    const team = await teamRes.json();
    const products = await productsRes.json(); // eslint-disable-line no-unused-vars

    const company = team.company;
    const person = team.members.find(m => m.slug === slug);
    if(!person){ document.body.innerHTML = '<p>Not found.</p>'; return; }

    // Build page HTML
    const page = `
      <section class="section">
        <div class="container">
          <div class="box p-6" style="border-radius: 20px;">
            <div class="is-flex is-align-items-center is-justify-content-space-between is-flex-wrap-wrap">
              <div class="is-flex is-align-items-center">
                <img src="${root}assets/img/logo.png" alt="Logo" style="height:64px;width:auto;margin-right:16px;">
                <div>
                  <h1 class="title is-3" style="margin:0;">${company.name}</h1>
                  <p class="subtitle is-6" style="margin:0;">${person.first} ${person.last} — ${person.title}</p>
                </div>
              </div>
            </div>

            <div class="columns is-mobile is-multiline mt-5">
              <div class="column is-3-desktop is-6-mobile has-text-centered">
                <button id="btnContact" class="button is-fullwidth is-primary">
                  <span class="icon"><i class="fa-solid fa-id-badge"></i></span><span>Contact Details</span>
                </button>
              </div>
              <div class="column is-3-desktop is-6-mobile has-text-centered">
                <a id="btnVcf" class="button is-fullwidth is-link" download="${slug}.vcf">
                  <span class="icon"><i class="fa-solid fa-address-card"></i></span><span>Save Contact</span>
                </a>
              </div>
              <div class="column is-3-desktop is-6-mobile has-text-centered">
                <a id="btnWhats" class="button is-fullwidth is-success" target="_blank" rel="noopener">
                  <span class="icon"><i class="fa-brands fa-whatsapp"></i></span><span>Chat on WhatsApp</span>
                </a>
              </div>
              <div class="column is-3-desktop is-6-mobile has-text-centered">
                <button id="btnProducts" class="button is-fullwidth">
                  <span class="icon"><i class="fa-solid fa-boxes-stacked"></i></span><span>Products</span>
                </button>
              </div>
            </div>

            <div id="productsPanel" class="mt-5" style="display:none;">
              <h2 class="title is-5">Products & Catalogs</h2>
              <div id="productsTree" class="menu"></div>
            </div>
          </div>
        </div>
      </section>

      <div id="contactModal" class="modal">
        <div class="modal-background"></div>
        <div class="modal-card" style="border-radius: 20px;">
          <header class="modal-card-head">
            <p class="modal-card-title">Contact — ${person.first} ${person.last}</p>
            <button class="delete" aria-label="close"></button>
          </header>
          <section class="modal-card-body content">
            <ul>
              <li><strong>Position:</strong> ${person.title}</li>
              <li><strong>Mobile/WhatsApp:</strong> ${person.mobile}</li>
              <li><strong>Email:</strong> <a href="mailto:${person.email}">${person.email}</a></li>
              <hr>
              <li><strong>Main Office:</strong> ${company.addresses.main_office}</li>
              <li><strong>Branch:</strong> ${company.addresses.branch}</li>
              <li><strong>Showroom & warehouses:</strong> ${company.addresses.showroom}</li>
              <li><strong>Landline:</strong> ${company.landline}</li>
              <li><strong>Fax:</strong> ${company.fax}</li>
              <li><strong>Company Email:</strong> <a href="mailto:${company.email}">${company.email}</a></li>
            </ul>
          </section>
          <footer class="modal-card-foot is-justify-content-flex-end">
            <button class="button is-primary">Close</button>
          </footer>
        </div>
      </div>
    `;
    document.body.innerHTML = page;

    // Wire up
    hookModal('contactModal', 'btnContact');
    document.getElementById('btnProducts').addEventListener('click', ()=>{
      const panel = document.getElementById('productsPanel');
      panel.style.display = panel.style.display === 'none' ? '' : 'none';
    });
    await buildProductsTree(root);
    const vcfUrl = makeVCardFor(person, company, location.href);
    const waUrl = makeWhatsAppLink(person.whatsapp || person.mobile);
    document.getElementById('btnVcf').href = vcfUrl;
    document.getElementById('btnWhats').href = waUrl;
  }

  // Public API
  return {
    initRootPage: function(){
      // Contact modal
      hookModal('contactModal', 'btnContact');

      // Products toggle
      const panel = document.getElementById('productsPanel');
      document.getElementById('btnProducts').addEventListener('click', ()=>{
        panel.style.display = panel.style.display === 'none' ? '' : 'none';
      });

      // Build products + team
      buildProductsTree('');
      buildTeamGrid();
    },
    initPersonPage: function(){
      // Read base root and slug from the inline config tag
      const cfg = document.getElementById('app-config');
      const root = cfg.dataset.root; // e.g. "../"
      const slug = cfg.dataset.person; // e.g. "fakhry-torfa"
      renderPersonPage(root, slug);
    }
  };
})();
</script>
