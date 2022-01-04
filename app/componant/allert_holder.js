
class Allert_Holder extends HTMLElement {
    constructor() {
        super();
        this.firest_connect_state=false;
        this.city=this.getAttribute('city')
        this.disise=this.getAttribute('disise')
        this.time=this.getAttribute('time')
        this.dates_state=this.getAttribute('dates_state')
    }

    firest_connect(){
        if(!this.firest_connect_state){
            this.render()
            this.set_backgroung_to_white_if_dates_state()
            this.firest_connect_state=true
        }
    }

    generate_dates_state_text_from_dates_state(){
        var dates_state_text=this.dates_state?'يوجد':'لايوجد';
        return dates_state_text;
    }

    set_backgroung_to_white_if_dates_state(){
        if(this.dates_state){
            this.style.background='rgb(255,255,255)';
        }
    }

    render(){
        this.innerHTML=`
            <info-line key='المدينه' value="${this.city}" dir='auto'></info-line>
            <info-line key='الاعاقه' value="${this.disise}" dir='auto'></info-line>
            <info-line key='الوقت' value="${this.time}" dir='auto'></info-line>
            <info-line key='المواعيد' value="${this.generate_dates_state_text_from_dates_state()}" dir='auto'></info-line>
        `       
    }

    connectedCallback(){ 
        this.firest_connect()           
    }

    run_on_Attribute_change(){
        if(this.firest_connect_state){
            return;
        } 
    }

    attributeChangedCallback(name, oldValue, newValue){
        this[name]=newValue;
        this.run_on_Attribute_change()
    } 
    static get observedAttributes() { return []; }    
           
}
customElements.define('allert-holder', Allert_Holder);