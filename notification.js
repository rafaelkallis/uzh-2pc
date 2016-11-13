const increment = 10;
const pi = 3.14159265;

export class Notification {
    constructor(text = '', duration) {
        this._element = document.createElement('div');
        this._element.classList.add('progress-outter');

        this._p = document.createElement('p');
        this._p.classList.add('progress-text');
        this._p.innerText = text;
        this._element.appendChild(this._p);

        this._inner = document.createElement('div');
        this._inner.classList.add('progress-inner');
        this._element.appendChild(this._inner);

        this._is_progress_active = false;

        duration && this.start_progress(duration);
    }

    get text() {
        return this._p.innerText;
    }

    set text(text) {
        if (this._p.innerText !== text) {
            this._p.innerText = text;
        }
    }

    get element() {
        return this._element;
    }

    start_progress(duration) {
        if (!this._is_progress_active) {
            this._is_progress_active = true;
            this._inner.style.width = '0';
            let ms_passed = 100;
            this._interval = setInterval(() => {
                ms_passed += increment;
                this._inner.style.width = (`${50 * (1 + Math.cos(pi + pi * Math.min(ms_passed / duration, 1)))}%`);
                if (ms_passed > duration) {
                    this.stop_progress();
                }
            }, increment);
        }
    }

    stop_progress() {
        if (this._is_progress_active){
            clearInterval(this._interval);
            this._is_progress_active = false;
        }
    }
}