import PyPDF2
import os

def extract_pdf_text(pdf_path):
    text = ""
    with open(pdf_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text += page.extract_text() + "\n"
    return text

if __name__ == "__main__":
    pdf_path = "Phone Scam Lookup Full Code.pdf"
    extracted_text = extract_pdf_text(pdf_path)
    
    # Save extracted text to a file
    with open("extracted_content.txt", "w", encoding="utf-8") as f:
        f.write(extracted_text)
    
    print("PDF content extracted to extracted_content.txt")
    print("\nFirst 1000 characters:")
    print(extracted_text[:1000])
